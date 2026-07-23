/**
 * Multi-Agent Manager - Backend Server
 * 
 * Express + Socket.IO server cung cấp:
 * - REST API cho task CRUD
 * - WebSocket real-time streaming
 * - SQLite persistence
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { body, query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const TaskDatabase = require('./database');
const TaskQueue = require('./task_queue');

// ─── Configuration ───
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const DB_PATH = process.env.DB_PATH || './data/tasks.db';

// ─── Initialize ───
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

const db = new TaskDatabase(DB_PATH);
const taskQueue = new TaskQueue({ maxConcurrent: 4 });

// ─── Helpers ───
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
  };
};

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

const submitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many task submissions, please slow down' }
});

// ─── Middleware ───
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) 
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
app.use('/api/', apiLimiter);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Task Queue Event Forwarding ───
taskQueue.on('task:log', (taskId, logEntry) => {
  try {
    // Save to DB
    db.addLog(taskId, logEntry.level, logEntry.message, 'worker');
  } catch (err) {
    console.warn(`[task:log] Failed to save log for task ${taskId}: ${err.message}`);
  }
  // Emit to clients (always emit even if DB fails - UI can still show logs)
  io.to(`task:${taskId}`).emit('log', { taskId, ...logEntry });
  io.emit('log:global', { taskId, ...logEntry });
});

taskQueue.on('task:started', (task) => {
  try {
    db.updateTaskStatus(task.id, 'running');
  } catch (err) {
    console.warn(`[task:started] Failed to update task ${task.id}: ${err.message}`);
  }
  io.to(`task:${task.id}`).emit('task:started', task);
  io.emit('task:updated', task);
});

taskQueue.on('task:completed', (task) => {
  try {
    db.updateTaskStatus(task.id, 'done', { exit_code: task.result?.exitCode });
  } catch (err) {
    console.warn(`[task:completed] Failed to update task ${task.id}: ${err.message}`);
  }
  io.to(`task:${task.id}`).emit('task:completed', task);
  io.emit('task:updated', task);
});

taskQueue.on('task:failed', (task, error) => {
  try {
    db.updateTaskStatus(task.id, 'error', { exit_code: -1 });
  } catch (err) {
    console.warn(`[task:failed] Failed to update task ${task.id}: ${err.message}`);
  }
  io.to(`task:${task.id}`).emit('task:failed', { taskId: task.id, error: error.message });
  io.emit('task:updated', task);
});

// ─── REST API ───

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── Projects ───

app.post('/api/projects', 
  submitLimiter,
  validate([
    body('name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 100 })
  ]),
  (req, res) => {
  const { name } = req.body;  
  const project = db.createProject(name);
  io.emit('project:created', project);
  res.status(201).json(project);
});

app.get('/api/projects', (req, res) => {
  const projects = db.getProjects();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// ─── Tasks ───

app.post('/api/tasks',
  submitLimiter,
  validate([
    body('projectId').isUUID().withMessage('Invalid project ID'),
    body('name').trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('prompt').trim().notEmpty().isLength({ max: 10000 })
  ]),
  (req, res) => {
  const task = db.createTask(req.body);
  
  // Thêm vào task queue để thực thi
  taskQueue.addTask({
    ...task,
    worktreePath: task.worktree_path,
    branchName: task.branch_name
  });
  
  io.emit('task:created', task);
  res.status(201).json(task);
});

app.get('/api/tasks', (req, res) => {
  const { project_id, status } = req.query;
  
  if (project_id) {
    const tasks = db.getTasksByProject(project_id);
    return res.json(tasks);
  }
  
  // Tất cả tasks
  const projects = db.getProjects();
  let allTasks = [];
  for (const project of projects) {
    const tasks = db.getTasksByProject(project.id);
    allTasks = allTasks.concat(tasks.map(t => ({ ...t, project_name: project.name })));
  }
  
  if (status) {
    allTasks = allTasks.filter(t => t.status === status);
  }
  
  res.json(allTasks);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = db.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.put('/api/tasks/:id/status',
  validate([
    param('id').isUUID(),
    body('status').isIn(['pending', 'running', 'done', 'error']),
    body('exit_code').optional().isInt()
  ]),
  (req, res) => {
  const { status, exit_code } = req.body;
  const task = db.updateTaskStatus(req.params.id, status, { exit_code });
  io.emit('task:updated', task);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  // Hủy task trong queue trước để tránh race condition
  taskQueue.cancelTask(req.params.id);
  
  const result = db.deleteTask(req.params.id);
  if (!result.success) {
    return res.status(404).json({ error: result.error || 'Task not found' });
  }
  io.emit('task:deleted', { id: req.params.id });
  res.json(result);
});

// ─── Logs ───

app.get('/api/tasks/:id/logs',
  validate([
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 })
  ]),
  (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const logs = db.getLogs(req.params.id, parseInt(limit), parseInt(offset));
  res.json(logs);
});

app.get('/api/logs/recent', (req, res) => {
  const { limit = 50 } = req.query;
  const logs = db.getRecentLogs(parseInt(limit));
  res.json(logs);
});

// ─── Worktrees ───

app.post('/api/worktrees',
  validate([
    body('task_id').isUUID(),
    body('path').trim().notEmpty(),
    body('branch_name').trim().notEmpty()
  ]),
  (req, res) => {
  const { task_id, path: worktreePath, branch_name } = req.body;
  const wt = db.createWorktree(task_id, worktreePath, branch_name);
  res.status(201).json(wt);
});

// ─── Queue Stats ───

app.get('/api/queue/stats', (req, res) => {
  res.json(taskQueue.getStats());
});

// ─── Socket.IO ───

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Join task room để nhận logs real-time
  socket.on('join:task', (taskId) => {
    socket.join(`task:${taskId}`);
    console.log(`  └─ Joined room: task:${taskId}`);
  });
  
  socket.on('leave:task', (taskId) => {
    socket.leave(`task:${taskId}`);
  });
  
  // Submit task mới (từ frontend)
  socket.on('task:submit', async (data) => {
    const { project_name, tasks } = data;
    
    // Create project
    const project = db.createProject(project_name || 'Quick Task');
    const createdTasks = [];
    
    for (const taskData of tasks) {
      const task = db.createTask({
        ...taskData,
        projectId: project.id
      });
      createdTasks.push(task);
      
      // Thêm vào queue
      taskQueue.addTask({
        ...task,
        worktreePath: task.worktree_path,
        branchName: task.branch_name
      });
    }
    
    socket.emit('tasks:submitted', { project, tasks: createdTasks });
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ─── Start Server (only when run directly, not when imported in tests) ───
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║     Multi-Agent Manager Backend Server       ║
╠══════════════════════════════════════════════╣
║  REST API : http://localhost:${PORT}/api     ║
║  WebSocket: ws://localhost:${PORT}           ║
║  Dashboard: ${CORS_ORIGIN}                  ║
║  DB       : ${DB_PATH}                      ║
╚══════════════════════════════════════════════╝
    `);
  });
}

module.exports = { app, server, db, io };

# 🖥️ TASK 2: Backend Server - Node.js + Express + SQLite

**Phụ trách:** Dev 2  
**Worktree:** `wt_server`  
**Công nghệ:** Node.js, Express, Socket.IO, better-sqlite3, dotenv

---

## 📋 Mục Tiêu

Xây dựng **Backend Server** bằng Node.js - lớp trung gian giữa Orchestrator Core và Frontend Dashboard. Server cung cấp:
1. REST API cho task management
2. WebSocket (Socket.IO) cho real-time log streaming
3. SQLite database cho task history persistence
4. Task Queue Manager

---

## 📁 File Cần Tạo

### 1. `backend/server/package.json`

```json
{
  "name": "multi-agent-server",
  "version": "1.0.0",
  "description": "Backend server for Multi-Agent Manager",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "node --test tests/*.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "socket.io": "^4.7.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {}
}
```

### 2. `backend/server/.env.example`

```
PORT=3001
CORS_ORIGIN=http://localhost:3000
DB_PATH=./data/tasks.db
LOG_DIR=./data/logs
```

### 3. `backend/server/database.js`

```javascript
/**
 * Database Module - SQLite Task & Log Persistence
 * 
 * Quản lý database SQLite chứa:
 * - tasks: Thông tin task
 * - logs: Log entries theo thời gian thực
 * - worktrees: Thông tin Git Worktree
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class TaskDatabase {
  constructor(dbPath = './data/tasks.db') {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this._initSchema();
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        assigned_worker TEXT DEFAULT 'opencode',
        worktree_path TEXT,
        branch_name TEXT,
        prompt TEXT,
        dependencies TEXT DEFAULT '[]',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        exit_code INTEGER,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        level TEXT DEFAULT 'info',
        message TEXT,
        source TEXT DEFAULT 'system',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS worktrees (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        path TEXT NOT NULL,
        branch_name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_logs_task ON logs(task_id);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
    `);
  }

  // ─── Project CRUD ───

  createProject(name) {
    const id = require('uuid').v4();
    const stmt = this.db.prepare(
      'INSERT INTO projects (id, name) VALUES (?, ?)'
    );
    stmt.run(id, name);
    return { id, name };
  }

  getProjects() {
    return this.db.prepare(
      'SELECT * FROM projects ORDER BY created_at DESC'
    ).all();
  }

  getProject(id) {
    return this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  }

  // ─── Task CRUD ───

  createTask({
    projectId,
    name,
    description = '',
    assignedWorker = 'opencode',
    worktreePath = '',
    branchName = '',
    prompt = '',
    dependencies = []
  }) {
    const id = require('uuid').v4();
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, project_id, name, description, assigned_worker, 
                         worktree_path, branch_name, prompt, dependencies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, projectId, name, description, assignedWorker,
      worktreePath, branchName, prompt, JSON.stringify(dependencies)
    );
    return this.getTask(id);
  }

  getTask(id) {
    const task = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (task) {
      task.dependencies = JSON.parse(task.dependencies || '[]');
    }
    return task;
  }

  getTasksByProject(projectId) {
    const tasks = this.db.prepare(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC'
    ).all(projectId);
    return tasks.map(t => ({
      ...t,
      dependencies: JSON.parse(t.dependencies || '[]')
    }));
  }

  updateTaskStatus(id, status, extras = {}) {
    const fields = ['status = ?'];
    const values = [status];

    if (status === 'running' && !extras.started_at) {
      fields.push('started_at = CURRENT_TIMESTAMP');
    }
    if (status === 'done' || status === 'error') {
      fields.push('completed_at = CURRENT_TIMESTAMP');
    }
    if (extras.exit_code !== undefined) {
      fields.push('exit_code = ?');
      values.push(extras.exit_code);
    }

    values.push(id);
    this.db.prepare(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`
    ).run(...values);

    return this.getTask(id);
  }

  // ─── Log CRUD ───

  addLog(taskId, level, message, source = 'system') {
    const stmt = this.db.prepare(`
      INSERT INTO logs (task_id, level, message, source) 
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(taskId, level, message, source);
    return {
      id: result.lastInsertRowid,
      task_id: taskId,
      level,
      message,
      source,
      timestamp: new Date().toISOString()
    };
  }

  getLogs(taskId, limit = 100, offset = 0) {
    return this.db.prepare(`
      SELECT * FROM logs 
      WHERE task_id = ? 
      ORDER BY timestamp ASC 
      LIMIT ? OFFSET ?
    `).all(taskId, limit, offset);
  }

  getRecentLogs(limit = 50) {
    return this.db.prepare(`
      SELECT l.*, t.name as task_name 
      FROM logs l 
      JOIN tasks t ON l.task_id = t.id 
      ORDER BY l.timestamp DESC 
      LIMIT ?
    `).all(limit);
  }

  // ─── Worktree CRUD ───

  createWorktree(taskId, worktreePath, branchName) {
    const id = require('uuid').v4();
    this.db.prepare(`
      INSERT INTO worktrees (id, task_id, path, branch_name)
      VALUES (?, ?, ?, ?)
    `).run(id, taskId, worktreePath, branchName);
    return { id, task_id: taskId, path: worktreePath, branch_name: branchName };
  }

  getWorktreesByTask(taskId) {
    return this.db.prepare(
      'SELECT * FROM worktrees WHERE task_id = ?'
    ).all(taskId);
  }

  close() {
    this.db.close();
  }
}

module.exports = TaskDatabase;
```

### 4. `backend/server/task_queue.js`

```javascript
/**
 * Task Queue Manager
 * 
 * Quản lý hàng đợi task, điều phối workers,
 * và theo dõi trạng thái thực thi.
 */

const EventEmitter = require('events');

class TaskQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 4;
    this.queue = [];
    this.running = new Map();
    this.completed = [];
    this.failed = [];
  }

  /**
   * Thêm task vào queue
   * @param {Object} task - Task object
   */
  addTask(task) {
    this.queue.push({
      ...task,
      status: 'queued',
      addedAt: new Date()
    });
    this.emit('task:queued', task);
    this._processQueue();
  }

  /**
   * Thêm nhiều task cùng lúc
   * @param {Array} tasks - Array of task objects
   */
  addTasks(tasks) {
    tasks.forEach(task => this.addTask(task));
  }

  /**
   * Xử lý queue - chạy các task available
   */
  _processQueue() {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      this._executeTask(task);
    }
  }

  /**
   * Thực thi một task
   * @param {Object} task - Task cần thực thi
   */
  async _executeTask(task) {
    task.status = 'running';
    task.startedAt = new Date();
    this.running.set(task.id, task);
    this.emit('task:started', task);

    try {
      // Thực thi task (gọi opencode CLI)
      const result = await this._runWorker(task);
      
      task.status = 'done';
      task.completedAt = new Date();
      task.result = result;
      
      this.running.delete(task.id);
      this.completed.push(task);
      this.emit('task:completed', task);
      
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error.message;
      
      this.running.delete(task.id);
      this.failed.push(task);
      this.emit('task:failed', task, error);
    }

    // Tiếp tục xử lý queue
    this._processQueue();
  }

  /**
   * Chạy worker (opencode) cho task
   * @param {Object} task - Task info
   * @returns {Promise<Object>} Kết quả thực thi
   */
  async _runWorker(task) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      
      // Tạo prompt cho opencode
      const prompt = this._buildPrompt(task);
      
      const worker = spawn('opencode', [prompt], {
        cwd: task.worktreePath || process.cwd(),
        shell: true,
        env: { ...process.env }
      });

      worker.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        this.emit('task:log', task.id, { level: 'info', message: text.trim() });
      });

      worker.stderr.on('data', (data) => {
        const text = data.toString();
        this.emit('task:log', task.id, { level: 'error', message: text.trim() });
      });

      worker.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          resolve({ exitCode: code, output, duration });
        } else {
          reject(new Error(`Worker exited with code ${code}: ${output.slice(-500)}`));
        }
      });

      worker.on('error', (err) => {
        reject(new Error(`Failed to start worker: ${err.message}`));
      });
    });
  }

  /**
   * Xây dựng prompt cho opencode
   * @param {Object} task - Task info
   * @returns {string} Prompt
   */
  _buildPrompt(task) {
    return `You are an AI developer working on a Multi-Agent project.

TASK ID: ${task.id}
TASK NAME: ${task.name}
DESCRIPTION: ${task.description}

WORKTREE PATH: ${task.worktreePath}
BRANCH: ${task.branchName}

INSTRUCTIONS:
${task.prompt}

Please implement this task completely and commit your changes with message: "[Dev${task.id}] ${task.name}"`;
  }

  /**
   * Lấy trạng thái tổng quan
   * @returns {Object} Queue stats
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      running: this.running.size,
      completed: this.completed.length,
      failed: this.failed.length,
      total: this.queue.length + this.running.size + this.completed.length + this.failed.length
    };
  }

  /**
   * Cancel all running tasks
   */
  cancelAll() {
    this.running.forEach((task, id) => {
      this.emit('task:cancelled', task);
    });
    this.running.clear();
    this.queue = [];
  }
}

module.exports = TaskQueue;
```

### 5. `backend/server/server.js`

```javascript
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

// ─── Middleware ───
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Task Queue Event Forwarding ───
taskQueue.on('task:log', (taskId, logEntry) => {
  // Save to DB
  db.addLog(taskId, logEntry.level, logEntry.message, 'worker');
  // Emit to clients
  io.to(`task:${taskId}`).emit('log', { taskId, ...logEntry });
  io.emit('log:global', { taskId, ...logEntry });
});

taskQueue.on('task:started', (task) => {
  db.updateTaskStatus(task.id, 'running');
  io.to(`task:${task.id}`).emit('task:started', task);
  io.emit('task:updated', task);
});

taskQueue.on('task:completed', (task) => {
  db.updateTaskStatus(task.id, 'done', { exit_code: task.result?.exitCode });
  io.to(`task:${task.id}`).emit('task:completed', task);
  io.emit('task:updated', task);
});

taskQueue.on('task:failed', (task, error) => {
  db.updateTaskStatus(task.id, 'error', { exit_code: -1 });
  io.to(`task:${task.id}`).emit('task:failed', { taskId: task.id, error: error.message });
  io.emit('task:updated', task);
});

// ─── REST API ───

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Projects ───

app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  
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

app.post('/api/tasks', (req, res) => {
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

app.put('/api/tasks/:id/status', (req, res) => {
  const { status, exit_code } = req.body;
  const task = db.updateTaskStatus(req.params.id, status, { exit_code });
  io.emit('task:updated', task);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  // Cleanup task data
  io.emit('task:deleted', { id: req.params.id });
  res.json({ success: true });
});

// ─── Logs ───

app.get('/api/tasks/:id/logs', (req, res) => {
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

app.post('/api/worktrees', (req, res) => {
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

// ─── Start Server ───
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
```

---

## 🎯 Yêu Cầu Hoàn Thành

1. ✅ Tạo đủ 5 file trong `backend/server/`
2. ✅ npm install và chạy được server
3. ✅ REST API health check trả về 200
4. ✅ Socket.IO kết nối thành công
5. ✅ SQLite lưu được task + logs
6. ✅ Task Queue xử lý được worker
7. ✅ Viết unit tests

---

## 📤 Giao Tiếp Với Các Dev Khác

- **Nhận từ Dev 1**: JSON plan qua API `POST /api/tasks` hoặc file `data/plan.json`
- **Gửi cho Dev 3**: Socket.IO events: `log`, `task:updated`, `task:completed`
- **Gửi cho Dev 4**: Webhook hoặc event khi task hoàn thành để trigger merge

---

## 🔗 Phụ Thuộc

- Task này **độc lập** (có thể làm song song với Dev 1)
- Dev 3 cần task này hoàn thành để có backend

---

## 📝 Hướng Dẫn Kiểm Thử

```bash
cd backend/server
npm install
npm run dev
# Mở terminal khác:
curl http://localhost:3001/api/health
```

*Happy coding! 🚀*

---
Working directory: wt_server
Target areas: backend/server/

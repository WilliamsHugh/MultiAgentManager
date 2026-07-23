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
        model TEXT DEFAULT 'auto',
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

    // Migration: add model column for existing DBs (safe to run)
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN model TEXT DEFAULT 'auto'`);
    } catch (_) {
      // Column already exists — ignore
    }
  }

  // ─── Project CRUD ───

  createProject(name) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
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
    model = 'auto',
    worktreePath = '',
    branchName = '',
    prompt = '',
    dependencies = []
  }) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, project_id, name, description, assigned_worker, model,
                         worktree_path, branch_name, prompt, dependencies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, projectId, name, description, assignedWorker, model,
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

  // ─── Task Delete ───

  deleteTask(id) {
    // Sử dụng transaction để đảm bảo atomicity
    const deleteOp = this.db.transaction(() => {
      // Xóa logs liên quan trước
      this.db.prepare('DELETE FROM logs WHERE task_id = ?').run(id);
      // Xóa worktrees liên quan
      this.db.prepare('DELETE FROM worktrees WHERE task_id = ?').run(id);
      // Xóa task
      const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
      return result.changes;
    });
    
    const changes = deleteOp(id);
    if (changes === 0) {
      return { success: false, error: 'Task not found' };
    }
    return { success: true };
  }

  // ─── Worktree CRUD ───

  createWorktree(taskId, worktreePath, branchName) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
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

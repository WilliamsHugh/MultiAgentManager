/**
 * Task Queue Manager
 * 
 * Quản lý hàng đợi task, điều phối workers,
 * và theo dõi trạng thái thực thi.
 */

const EventEmitter = require('events');
const { spawn, execSync } = require('child_process');

class TaskQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 4;
    this.queue = [];
    this.running = new Map();
    this.completed = [];
    this.failed = [];
    this._cancelledIds = new Set();
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
   * Kiểm tra xem opencode CLI có available không
   */
  _isToolAvailable(tool) {
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Thực thi một task — chạy worker ngay lập tức
   * 
   * @param {Object} task - Task cần thực thi
   */
  async _executeTask(task) {
    // Mark as running
    task.status = 'running';
    this.running.set(task.id, task);
    this.emit('task:started', task);

    try {
      // Log start
      this.emit('task:log', task.id, {
        level: 'info',
        message: `Task "${task.name}" started.`
      });

      // Kiểm tra xem có opencode CLI không
      const hasOpenCode = this._isToolAvailable('opencode');
      
      if (hasOpenCode) {
        // Chạy worker thật
        const result = await this._runWorker(task);
        
        task.status = 'done';
        task.result = result;
        this.running.delete(task.id);
        this.completed.push(task);
        this.emit('task:completed', task);
        
        this.emit('task:log', task.id, {
          level: 'info',
          message: `Task "${task.name}" completed (exit: ${result.exitCode}, duration: ${(result.duration / 1000).toFixed(1)}s).`
        });
      } else {
        // Không có opencode — mô phỏng chạy task (feedback cho UI)
        this.emit('task:log', task.id, {
          level: 'warn',
          message: `opencode CLI not found. Running in simulation mode.`
        });
        
        // Mô phỏng xử lý
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        task.status = 'done';
        task.result = { exitCode: 0, duration: 2000 };
        this.running.delete(task.id);
        this.completed.push(task);
        this.emit('task:completed', task);
        
        this.emit('task:log', task.id, {
          level: 'info',
          message: `Task "${task.name}" completed (simulated). Install opencode CLI for real execution.`
        });
      }
    } catch (error) {
      // Nếu task đã bị cancel bởi cancelTask(), không push lại vào failed
      if (this._cancelledIds.has(task.id)) {
        this.running.delete(task.id);
        this._processQueue();
        return;
      }
      
      task.status = 'error';
      task.error = error.message;
      this.running.delete(task.id);
      this.failed.push(task);
      this.emit('task:failed', task, error);
      
      this.emit('task:log', task.id, {
        level: 'error',
        message: `Task "${task.name}" failed: ${error.message}`
      });
    }

    // Tiếp tục xử lý queue cho task tiếp theo
    this._processQueue();
  }

  /**
   * Chạy worker (opencode) cho task
   * @param {Object} task - Task info
   * @returns {Promise<Object>} Kết quả thực thi
   */
  async _runWorker(task) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      
      // Tạo prompt cho opencode
      const prompt = this._buildPrompt(task);

      const worker = spawn('opencode', [prompt], {
        cwd: this._resolveWorktreePath(task),
        env: { ...process.env }
      });

      const isNotCancelled = () => !this._cancelledIds.has(task.id);

      worker.stdout.on('data', (data) => {
        if (!isNotCancelled()) return;
        const text = data.toString();
        output += text;
        this.emit('task:log', task.id, { level: 'info', message: text.trim() });
      });

      worker.stderr.on('data', (data) => {
        if (!isNotCancelled()) return;
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
   * Giải quyết đường dẫn worktree an toàn cho worker.
   * Nếu task.worktreePath hợp lệ (ngắn, chỉ chứa ký tự path an toàn,
   * và là thư mục tồn tại) thì dùng; ngược lại fallback về repo root.
   * @param {Object} task - Task info
   * @returns {string} Đường dẫn cwd an toàn cho spawn
   */
  _resolveWorktreePath(task) {
    const raw = task && task.worktreePath;
    if (!raw || typeof raw !== 'string') return process.cwd();
    // Chặn path quá dài (tránh ENAMETOOLONG) và ký tự nguy hiểm
    if (raw.length > 200) return process.cwd();
    if (/[\0\n\r\t]/.test(raw)) return process.cwd();
    // Chỉ chấp path tương đối/an toàn, không chứa '..' thoát ra ngoài
    if (raw.includes('..')) return process.cwd();
    const fs = require('fs');
    try {
      const resolved = require('path').resolve(process.cwd(), raw);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        return resolved;
      }
    } catch {
      // ignore, fallback below
    }
    return process.cwd();
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
   * Cancel a specific task by ID
   * @param {string} id - Task ID to cancel
   * @returns {boolean} True if task was found and cancelled
   */
  cancelTask(id) {
    this._cancelledIds.add(id);
    
    if (this.running.has(id)) {
      const task = this.running.get(id);
      this.running.delete(id);
      this.failed.push({ ...task, status: 'cancelled' });
      this.emit('task:cancelled', task);
      return true;
    }
    
    const queueIndex = this.queue.findIndex(t => t.id === id);
    if (queueIndex !== -1) {
      const task = this.queue.splice(queueIndex, 1)[0];
      this.failed.push({ ...task, status: 'cancelled' });
      this.emit('task:cancelled', task);
      return true;
    }
    
    return false;
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

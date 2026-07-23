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

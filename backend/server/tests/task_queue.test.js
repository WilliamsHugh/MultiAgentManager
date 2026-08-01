const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const TaskQueue = require('../task_queue');

describe('TaskQueue', () => {
  let queue;

  before(() => {
    queue = new TaskQueue({ maxConcurrent: 2 });
  });

  after(() => {
    queue.cancelAll();
  });

  it('should start with empty stats', () => {
    const stats = queue.getStats();
    assert.strictEqual(stats.queueLength, 0);
    assert.strictEqual(stats.running, 0);
    assert.strictEqual(stats.completed, 0);
    assert.strictEqual(stats.failed, 0);
    assert.strictEqual(stats.total, 0);
  });

  it('should queue and immediately start executing tasks', () => {
    const q = new TaskQueue({ maxConcurrent: 2 });
    q.addTask({ id: 'test-1', name: 'Test Task 1', prompt: 'exit', description: '', worktreePath: '', branchName: '' });
    q.addTask({ id: 'test-2', name: 'Test Task 2', prompt: 'exit', description: '', worktreePath: '', branchName: '' });
    q.addTask({ id: 'test-3', name: 'Test Task 3', prompt: 'exit', description: '', worktreePath: '', branchName: '' });

    const stats = q.getStats();
    // Queue should empty immediately (maxConcurrent = 2, so 2 running, 1 still in queue...)
    // Actually with immediate execution, all 3 shift from queue since maxConcurrent is checked per shift
    // But running is async, so after synchronous shift: queueLength = 0, running = 2 (as many as maxConcurrent allows)
    assert.strictEqual(stats.queueLength, 1);
    assert.strictEqual(stats.running, 2);
    q.cancelAll();
  });

  it('should emit task:queued event', () => {
    return new Promise((resolve, reject) => {
      const q = new TaskQueue({ maxConcurrent: 2 });
      q.on('task:queued', (task) => {
        assert.strictEqual(task.id, 'queued-test');
        q.cancelAll();
        resolve();
      });
      q.addTask({ id: 'queued-test', name: 'Queued Test', prompt: 'exit', description: '', worktreePath: '', branchName: '' });
    });
  });

  it('should emit task:started event', () => {
    return new Promise((resolve, reject) => {
      const q = new TaskQueue({ maxConcurrent: 2 });
      q.on('task:started', (task) => {
        assert.strictEqual(task.id, 'started-test');
        q.cancelAll();
        resolve();
      });
      q.addTask({ id: 'started-test', name: 'Started Test', prompt: 'exit', description: '', worktreePath: '', branchName: '' });
    });
  });

  it('should resolve tasks to completed or failed (not stuck pending)', async () => {
    const q = new TaskQueue({ maxConcurrent: 2 });

    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ timedOut: true }), 8000);

      q.on('task:completed', (task) => {
        clearTimeout(timeout);
        resolve({ status: 'completed', task });
      });

      q.on('task:failed', (task, error) => {
        clearTimeout(timeout);
        resolve({ status: 'failed', task, error: error.message });
      });

      q.addTask({ id: 'resolve-test', name: 'Resolve Test', prompt: 'exit', description: '', worktreePath: '', branchName: '' });
    });

    assert.ok(result.status === 'completed' || result.status === 'failed',
      `Task should resolve to completed or failed, got: ${result.status}${result.timedOut ? ' (timeout)' : ''}`);
    assert.notStrictEqual(result.status, 'pending');
    q.cancelAll();
  });

  it('should add multiple tasks at once', () => {
    const q = new TaskQueue({ maxConcurrent: 2 });
    q.addTasks([
      { id: 'multi-1', name: 'Multi Task 1', prompt: 'exit', description: '', worktreePath: '', branchName: '' },
      { id: 'multi-2', name: 'Multi Task 2', prompt: 'exit', description: '', worktreePath: '', branchName: '' },
      { id: 'multi-3', name: 'Multi Task 3', prompt: 'exit', description: '', worktreePath: '', branchName: '' }
    ]);

    const stats = q.getStats();
    assert.strictEqual(stats.queueLength, 1);
    assert.strictEqual(stats.running, 2);
    q.cancelAll();
  });

  it('should build prompt correctly', () => {
    const task = {
      id: 'prompt-test',
      name: 'Prompt Test',
      description: 'Testing prompt',
      worktreePath: '/tmp/worktree',
      branchName: 'feature/test',
      prompt: 'Do the thing'
    };

    const prompt = queue._buildPrompt(task);
    assert.ok(prompt.includes('TASK ID: prompt-test'));
    assert.ok(prompt.includes('TASK NAME: Prompt Test'));
    assert.ok(prompt.includes('DESCRIPTION: Testing prompt'));
    assert.ok(prompt.includes('WORKTREE PATH: /tmp/worktree'));
    assert.ok(prompt.includes('BRANCH: feature/test'));
    assert.ok(prompt.includes('Do the thing'));
  });

  it('should cancel running and queued tasks', () => {
    const q = new TaskQueue({ maxConcurrent: 2 });
    q.addTasks([
      { id: 'cancel-1', name: 'Cancel Task 1', prompt: 'exit', description: '', worktreePath: '', branchName: '' },
      { id: 'cancel-2', name: 'Cancel Task 2', prompt: 'exit', description: '', worktreePath: '', branchName: '' },
      { id: 'cancel-3', name: 'Cancel Task 3', prompt: 'exit', description: '', worktreePath: '', branchName: '' }
    ]);

    q.cancelAll();
    const stats = q.getStats();
    assert.strictEqual(stats.running, 0);
    assert.strictEqual(stats.queueLength, 0);
  });

  it('should cancel individual task by ID', () => {
    const q = new TaskQueue({ maxConcurrent: 2 });
    q.addTasks([
      { id: 'single-cancel-1', name: 'Task 1', prompt: 'exit', description: '', worktreePath: '', branchName: '' },
      { id: 'single-cancel-2', name: 'Task 2', prompt: 'exit', description: '', worktreePath: '', branchName: '' },
    ]);

    // Cancel the second task
    const result = q.cancelTask('single-cancel-2');
    assert.ok(result);

    const stats = q.getStats();
    assert.strictEqual(stats.queueLength, 0);
    assert.strictEqual(stats.running, 1); // Only first task still running
    q.cancelAll();
  });
});

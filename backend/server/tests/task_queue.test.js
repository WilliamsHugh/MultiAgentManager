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

  it('should delegate tasks to manager (no auto-execution)', () => {
    const q = new TaskQueue({ maxConcurrent: 2 });
    q.addTask({ id: 'test-1', name: 'Test Task 1' });
    q.addTask({ id: 'test-2', name: 'Test Task 2' });
    q.addTask({ id: 'test-3', name: 'Test Task 3' });
    // All tasks go to pending-manager, queue empties immediately
    const stats = q.getStats();
    assert.strictEqual(stats.queueLength, 0);
    assert.strictEqual(stats.running, 0);
    // pendingManager tracks tasks awaiting manager
    assert.strictEqual(q._pendingManager.length, 3);
    q.cancelAll();
  });

  it('should emit task:queued event', () => {
    return new Promise((resolve, reject) => {
      const q = new TaskQueue({ maxConcurrent: 2 });
      q.on('task:queued', (task) => {
        assert.strictEqual(task.id, 'queued-test');
        resolve();
      });
      q.addTask({ id: 'queued-test', name: 'Queued Test' });
      q.cancelAll();
    });
  });

  it('should add multiple tasks at once (all go to pending-manager)', () => {
    const q = new TaskQueue({ maxConcurrent: 2 });
    q.addTasks([
      { id: 'multi-1', name: 'Multi Task 1' },
      { id: 'multi-2', name: 'Multi Task 2' },
      { id: 'multi-3', name: 'Multi Task 3' }
    ]);
    // All 3 tasks are in pending-manager, not running
    assert.strictEqual(q._pendingManager.length, 3);
    q.cancelAll();
  });

  it('should not auto-execute tasks (all await manager)', () => {
    const q = new TaskQueue({ maxConcurrent: 2 });
    q.addTasks([
      { id: 'concurrent-1', name: 'Concurrent Task 1' },
      { id: 'concurrent-2', name: 'Concurrent Task 2' },
      { id: 'concurrent-3', name: 'Concurrent Task 3' }
    ]);
    // Tasks are in pending-manager, NOT running
    assert.strictEqual(q.running.size, 0);
    assert.strictEqual(q.queue.length, 0);
    assert.strictEqual(q._pendingManager.length, 3);
    q.cancelAll();
  });

  it('should emit events in correct order (pending-manager)', () => {
    return new Promise((resolve, reject) => {
      const q = new TaskQueue({ maxConcurrent: 1 });
      const events = [];

      q.on('task:queued', (task) => events.push('queued'));
      q.on('task:awaiting-manager', (task) => {
        events.push('awaiting-manager');
        assert.deepStrictEqual(events, ['queued', 'awaiting-manager']);
        resolve();
      });

      q.addTask({ id: 'event-order', name: 'Event Order Test', prompt: 'exit 1' });
    });
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

  it('should cancel all running and queued tasks', () => {
    const q = new TaskQueue({ maxConcurrent: 2 });
    q.addTasks([
      { id: 'cancel-1', name: 'Cancel Task 1' },
      { id: 'cancel-2', name: 'Cancel Task 2' },
      { id: 'cancel-3', name: 'Cancel Task 3' }
    ]);

    q.cancelAll();
    const stats = q.getStats();
    assert.strictEqual(stats.running, 0);
    assert.strictEqual(stats.queueLength, 0);
  });

  it('should delegate task to manager (no auto-execution)', async () => {
    const q = new TaskQueue({ maxConcurrent: 1 });

    const result = await new Promise((resolve) => {
      q.on('task:awaiting-manager', (task) => {
        resolve({ task });
      });
      q.addTask({
        id: 'manager-delegate',
        name: 'Manager Delegate',
        prompt: 'test',
        worktreePath: '/nonexistent/path'
      });
    });

    assert.ok(result.task);
    assert.strictEqual(result.task.status, 'pending');
    // Task should NOT be in running or failed - it's pending manager
    const stats = q.getStats();
    assert.strictEqual(stats.running, 0);
    assert.strictEqual(stats.failed, 0);
    q.cancelAll();
  });
});

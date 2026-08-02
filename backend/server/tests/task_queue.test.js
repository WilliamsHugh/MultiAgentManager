const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Unit test KHÔNG được spawn opencode thật (agent chạy phút, treo suite).
// Inject stub CLI qua OPENCODE_BIN trước khi require task_queue.
process.env.OPENCODE_BIN = path.join(__dirname, 'fixtures', 'stub-cli.js');

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

  it('should embed the exact commit-message contract "[Dev<id>] <name>" in the prompt', () => {
    const task = {
      id: '6fe7973d-6bf2-44ee-9e2e-bcdf0be3d855',
      name: 'Test Task',
      description: 'A test task',
      worktreePath: '',
      branchName: '',
      prompt: 'Do something'
    };

    const prompt = queue._buildPrompt(task);
    assert.ok(
      prompt.includes(`Please implement this task completely and commit your changes with message: "[Dev${task.id}] ${task.name}"`),
      'prompt must carry the exact commit message the worker is expected to use'
    );
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

describe('TaskQueue._resolveWorktreePath (regression: ENAMETOOLONG)', () => {
  const path = require('path');
  const os = require('os');
  const fs = require('fs');
  let q;

  before(() => { q = new TaskQueue({ maxConcurrent: 1 }); });
  after(() => { q.cancelAll(); });

  it('falls back to cwd when task is null/undefined', () => {
    assert.strictEqual(q._resolveWorktreePath(undefined), process.cwd());
    assert.strictEqual(q._resolveWorktreePath(null), process.cwd());
  });

  it('falls back to cwd when worktreePath is missing or empty', () => {
    assert.strictEqual(q._resolveWorktreePath({}), process.cwd());
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: '' }), process.cwd());
  });

  it('falls back to cwd when worktreePath is not a string', () => {
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: 123 }), process.cwd());
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: { a: 1 } }), process.cwd());
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: ['/tmp'] }), process.cwd());
  });

  it('falls back to cwd when worktreePath is longer than 200 chars (prompt leaked into path)', () => {
    const leaked = 'You are an AI developer working on a Multi-Agent project. '.repeat(10);
    assert.ok(leaked.length > 200);
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: leaked }), process.cwd());
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: 'a'.repeat(201) }), process.cwd());
  });

  it('accepts a path of exactly 200 chars without tripping the length guard', () => {
    // 200 chars is allowed by the guard; it just fails the existsSync check -> cwd
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: 'b'.repeat(200) }), process.cwd());
  });

  it('falls back to cwd when worktreePath contains ".."', () => {
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: '../../etc' }), process.cwd());
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: 'wt/../..' }), process.cwd());
  });

  it('falls back to cwd on control characters (\\n, \\0, \\r, \\t)', () => {
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: '/tmp/bad\npath' }), process.cwd());
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: '/tmp/bad\0path' }), process.cwd());
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: '/tmp/bad\rpath' }), process.cwd());
    assert.strictEqual(q._resolveWorktreePath({ worktreePath: '/tmp/bad\tpath' }), process.cwd());
  });

  it('falls back to cwd when the directory does not exist', () => {
    assert.strictEqual(
      q._resolveWorktreePath({ worktreePath: path.join(os.tmpdir(), 'no-such-wt-' + Date.now()) }),
      process.cwd()
    );
  });

  it('falls back to cwd when the path exists but is a file, not a directory', () => {
    const f = path.join(os.tmpdir(), 'wt-file-' + Date.now() + '.txt');
    fs.writeFileSync(f, 'x');
    try {
      assert.strictEqual(q._resolveWorktreePath({ worktreePath: f }), process.cwd());
    } finally { fs.unlinkSync(f); }
  });

  it('returns the resolved absolute path for a valid existing directory', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-ok-'));
    try {
      const got = q._resolveWorktreePath({ worktreePath: d });
      assert.strictEqual(got, fs.realpathSync.native ? path.resolve(d) : d);
      assert.ok(path.isAbsolute(got));
      assert.notStrictEqual(got, process.cwd());
    } finally { fs.rmSync(d, { recursive: true, force: true }); }
  });

  it('resolves a relative existing directory against process.cwd()', () => {
    const got = q._resolveWorktreePath({ worktreePath: 'tests' });
    assert.strictEqual(got, path.resolve(process.cwd(), 'tests'));
  });
});

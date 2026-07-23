const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const TaskDatabase = require('../database');

const TEST_DB = path.join(__dirname, '..', 'data', 'test-tasks.db');

describe('TaskDatabase', () => {
  let db;

  before(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    db = new TaskDatabase(TEST_DB);
  });

  after(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('should create and retrieve a project', () => {
    const project = db.createProject('Test Project');
    assert.ok(project.id);
    assert.strictEqual(project.name, 'Test Project');

    const fetched = db.getProject(project.id);
    assert.strictEqual(fetched.name, 'Test Project');
  });

  it('should return all projects ordered by created_at DESC', () => {
    db.createProject('Project A');
    db.createProject('Project B');
    const projects = db.getProjects();
    assert.ok(projects.length >= 2);
  });

  it('should return null for non-existent project', () => {
    const project = db.getProject('non-existent');
    assert.strictEqual(project, undefined);
  });

  it('should create a task with all fields', () => {
    const project = db.createProject('Task Test Project');
    const task = db.createTask({
      projectId: project.id,
      name: 'Test Task',
      description: 'A test task',
      assignedWorker: 'opencode',
      worktreePath: '/tmp/worktree',
      branchName: 'feature/test',
      prompt: 'Do something',
      dependencies: ['dep1', 'dep2']
    });

    assert.ok(task.id);
    assert.strictEqual(task.name, 'Test Task');
    assert.strictEqual(task.project_id, project.id);
    assert.strictEqual(task.assigned_worker, 'opencode');
    assert.strictEqual(task.worktree_path, '/tmp/worktree');
    assert.strictEqual(task.branch_name, 'feature/test');
    assert.strictEqual(task.prompt, 'Do something');
    assert.deepStrictEqual(task.dependencies, ['dep1', 'dep2']);
    assert.strictEqual(task.status, 'pending');
  });

  it('should get tasks by project', () => {
    const project = db.createProject('Get Tasks Project');
    db.createTask({ projectId: project.id, name: 'Task 1' });
    db.createTask({ projectId: project.id, name: 'Task 2' });

    const tasks = db.getTasksByProject(project.id);
    assert.strictEqual(tasks.length, 2);
  });

  it('should get a single task by id', () => {
    const project = db.createProject('Single Task Project');
    const created = db.createTask({ projectId: project.id, name: 'Single Task' });

    const fetched = db.getTask(created.id);
    assert.strictEqual(fetched.name, 'Single Task');
    assert.ok(Array.isArray(fetched.dependencies));
  });

  it('should update task status to running', () => {
    const project = db.createProject('Status Test Project');
    const task = db.createTask({ projectId: project.id, name: 'Status Test' });

    const updated = db.updateTaskStatus(task.id, 'running');
    assert.strictEqual(updated.status, 'running');
    assert.ok(updated.started_at);
  });

  it('should update task status to done with exit code', () => {
    const project = db.createProject('Done Test Project');
    const task = db.createTask({ projectId: project.id, name: 'Done Test' });
    db.updateTaskStatus(task.id, 'running');

    const updated = db.updateTaskStatus(task.id, 'done', { exit_code: 0 });
    assert.strictEqual(updated.status, 'done');
    assert.strictEqual(updated.exit_code, 0);
    assert.ok(updated.completed_at);
  });

  it('should update task status to error', () => {
    const project = db.createProject('Error Test Project');
    const task = db.createTask({ projectId: project.id, name: 'Error Test' });
    db.updateTaskStatus(task.id, 'running');

    const updated = db.updateTaskStatus(task.id, 'error', { exit_code: 1 });
    assert.strictEqual(updated.status, 'error');
    assert.strictEqual(updated.exit_code, 1);
  });

  it('should add and retrieve logs', () => {
    const project = db.createProject('Log Test Project');
    const task = db.createTask({ projectId: project.id, name: 'Log Test' });

    db.addLog(task.id, 'info', 'Test log message', 'system');
    db.addLog(task.id, 'error', 'Error message', 'worker');

    const logs = db.getLogs(task.id);
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].level, 'info');
    assert.strictEqual(logs[1].level, 'error');
  });

  it('should get recent logs with task name', () => {
    const project = db.createProject('Recent Logs Project');
    const task = db.createTask({ projectId: project.id, name: 'Recent Logs Task' });
    db.addLog(task.id, 'info', 'Recent log entry');

    const recentLogs = db.getRecentLogs(10);
    assert.ok(recentLogs.length >= 1);
    assert.ok(recentLogs[0].task_name);
  });

  it('should paginate logs with limit and offset', () => {
    const project = db.createProject('Pagination Project');
    const task = db.createTask({ projectId: project.id, name: 'Pagination Task' });

    for (let i = 0; i < 10; i++) {
      db.addLog(task.id, 'info', `Log entry ${i}`);
    }

    const page1 = db.getLogs(task.id, 3, 0);
    const page2 = db.getLogs(task.id, 3, 3);

    assert.strictEqual(page1.length, 3);
    assert.strictEqual(page2.length, 3);
    assert.notStrictEqual(page1[0].id, page2[0].id);
  });

  it('should create and retrieve worktrees', () => {
    const project = db.createProject('Worktree Project');
    const task = db.createTask({ projectId: project.id, name: 'Worktree Task' });

    const wt = db.createWorktree(task.id, '/path/to/worktree', 'feature/worktree');
    assert.ok(wt.id);
    assert.strictEqual(wt.path, '/path/to/worktree');
    assert.strictEqual(wt.branch_name, 'feature/worktree');

    const worktrees = db.getWorktreesByTask(task.id);
    assert.strictEqual(worktrees.length, 1);
  });
});

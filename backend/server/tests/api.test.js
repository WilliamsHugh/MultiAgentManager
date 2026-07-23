const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, '..', 'data', 'test-api.db');
const PORT = 3099;

let baseUrl;
let serverInstance;

function httpRequest(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('REST API', () => {
  let projectId;
  let taskId;

  before(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    process.env.DB_PATH = TEST_DB;
    process.env.PORT = String(PORT);
    baseUrl = `http://localhost:${PORT}`;
    const { server } = require('../server');
    serverInstance = server;
    await new Promise((resolve) => serverInstance.listen(PORT, resolve));
  });

  after((done) => {
    serverInstance.close(done);
  });

  it('GET /api/health should return 200', async () => {
    const res = await httpRequest('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.timestamp);
  });

  it('POST /api/projects should create a project', async () => {
    const res = await httpRequest('POST', '/api/projects', { name: 'Test Project' });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.name, 'Test Project');
    projectId = res.body.id;
  });

  it('POST /api/projects should fail without name', async () => {
    const res = await httpRequest('POST', '/api/projects', {});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('GET /api/projects should return projects', async () => {
    const res = await httpRequest('GET', '/api/projects');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  it('GET /api/projects/:id should return a project', async () => {
    const res = await httpRequest('GET', `/api/projects/${projectId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, projectId);
  });

  it('GET /api/projects/:id should 404 for unknown project', async () => {
    const res = await httpRequest('GET', '/api/projects/nonexistent');
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/tasks should create a task', async () => {
    const res = await httpRequest('POST', '/api/tasks', {
      projectId,
      name: 'Test Task',
      description: 'A test task',
      assignedWorker: 'opencode',
      prompt: 'Do something'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.name, 'Test Task');
    assert.strictEqual(res.body.status, 'pending');
    taskId = res.body.id;
  });

  it('GET /api/tasks should return all tasks', async () => {
    const res = await httpRequest('GET', '/api/tasks');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  it('GET /api/tasks?project_id= should filter by project', async () => {
    const res = await httpRequest('GET', `/api/tasks?project_id=${projectId}`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.every(t => t.project_id === projectId));
  });

  it('GET /api/tasks/:id should return a task', async () => {
    const res = await httpRequest('GET', `/api/tasks/${taskId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, taskId);
  });

  it('GET /api/tasks/:id should 404 for unknown task', async () => {
    const res = await httpRequest('GET', '/api/tasks/nonexistent');
    assert.strictEqual(res.status, 404);
  });

  it('PUT /api/tasks/:id/status should update task status', async () => {
    const res = await httpRequest('PUT', `/api/tasks/${taskId}/status`, { status: 'running' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'running');
  });

  it('GET /api/tasks/:id/logs should return logs', async () => {
    const res = await httpRequest('GET', `/api/tasks/${taskId}/logs`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET /api/logs/recent should return recent logs', async () => {
    const res = await httpRequest('GET', '/api/logs/recent');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('POST /api/worktrees should create a worktree record', async () => {
    const res = await httpRequest('POST', '/api/worktrees', {
      task_id: taskId,
      path: '/tmp/worktree',
      branch_name: 'feature/test'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.task_id, taskId);
  });

  it('GET /api/queue/stats should return queue stats', async () => {
    const res = await httpRequest('GET', '/api/queue/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.hasOwnProperty('queueLength'));
    assert.ok(res.body.hasOwnProperty('running'));
    assert.ok(res.body.hasOwnProperty('completed'));
    assert.ok(res.body.hasOwnProperty('failed'));
    assert.ok(res.body.hasOwnProperty('total'));
  });

  it('DELETE /api/tasks/:id should delete a task', async () => {
    const res = await httpRequest('DELETE', `/api/tasks/${taskId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});

#!/usr/bin/env node
/**
 * E2E T2: REST tạo task thật -> TaskQueue -> spawn opencode -> log stream ra socket.io.
 * Chạy: PORT=3999 DB_PATH=/tmp/e2e_t2.db node scripts/e2e_opencode.js
 */
process.env.PORT = process.env.PORT || '3999';
process.env.DB_PATH = process.env.DB_PATH || '/tmp/e2e_t2.db';

const { server, io } = require('../server');
const { io: ioClient } = require('../../../frontend/node_modules/socket.io-client');

const PORT = process.env.PORT;
const received = [];

server.listen(PORT, async () => {
  const sock = ioClient(`http://localhost:${PORT}`, { transports: ['websocket'] });
  await new Promise((r) => sock.on('connect', r));
  console.log('[e2e] socket connected:', sock.id);

  sock.on('log:global', (e) => {
    received.push(e);
    console.log(`[socket log:global] level=${e.level} :: ${String(e.message).slice(0, 200)}`);
  });
  sock.on('task:updated', (t) => console.log(`[socket task:updated] ${t.id} status=${t.status}`));

  const base = `http://localhost:${PORT}/api`;
  const p = await (await fetch(`${base}/projects`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E T2 opencode' })
  })).json();
  console.log('[e2e] project:', p.id);

  const t = await (await fetch(`${base}/tasks`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: p.id, name: 'E2E ping',
      description: 'smoke',
      prompt: 'Print exactly the single word ORANGE and do nothing else. Do not create files.'
    })
  })).json();
  console.log('[e2e] task:', t.id, 'worktree_path=', JSON.stringify(t.worktree_path));

  const done = await new Promise((resolve) => {
    const to = setTimeout(() => resolve('TIMEOUT'), 180000);
    sock.on('task:updated', (u) => {
      if (u.id === t.id && ['done', 'error'].includes(u.status)) { clearTimeout(to); resolve(u.status); }
    });
  });

  console.log(`\n[e2e] FINAL status=${done} logEvents=${received.length}`);
  console.log('[e2e] ORANGE seen in stream:',
    received.some((e) => /ORANGE/.test(String(e.message))));
  sock.close(); io.close(); server.close(); process.exit(0);
});

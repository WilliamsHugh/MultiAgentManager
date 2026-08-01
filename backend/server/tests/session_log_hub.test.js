'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { SessionLogHub } = require('../session_log_hub');

function logEvent(seq, over = {}) {
  return {
    type: 'log', sessionId: 's', source: 'opencode', taskId: 'T2',
    stream: 'stdout', level: 'info', seq, ts: 1.0, text: `line ${seq}`, ...over
  };
}
function statusEvent(seq, state, exitCode = null) {
  return {
    type: 'status', sessionId: 's', source: 'opencode', taskId: 'T2',
    state, exitCode, seq, ts: 1.0
  };
}

function fakeIo() {
  const emitted = [];
  return {
    emitted,
    to(room) {
      return { emit: (ev, payload) => emitted.push({ room, ev, payload }) };
    }
  };
}

test('validateEvent accepts valid log and status', () => {
  assert.strictEqual(SessionLogHub.validateEvent(logEvent(1)), null);
  assert.strictEqual(SessionLogHub.validateEvent(statusEvent(2, 'exited', 0)), null);
});

test('validateEvent rejects bad fields', () => {
  assert.match(SessionLogHub.validateEvent(logEvent(1, { level: 'fatal' })), /level/);
  assert.match(SessionLogHub.validateEvent(logEvent(1, { stream: 'stdin' })), /stream/);
  assert.match(SessionLogHub.validateEvent(logEvent(1, { source: 'bogus' })), /source/);
  assert.match(SessionLogHub.validateEvent(logEvent('x')), /seq/);
  assert.match(SessionLogHub.validateEvent(statusEvent(1, 'zombie')), /state/);
  assert.match(SessionLogHub.validateEvent(null), /object/);
});

test('ingest preserves seq exactly, does not renumber', () => {
  const hub = new SessionLogHub();
  const io = fakeIo();
  hub.ingest('s1', [logEvent(7), logEvent(8), statusEvent(9, 'exited', 0)], io);
  const seqs = hub.history('s1').events.map(e => e.seq);
  assert.deepStrictEqual(seqs, [7, 8, 9]);
});

test('broadcasts to session room only, not globally', () => {
  const hub = new SessionLogHub();
  const io = fakeIo();
  hub.ingest('abc', [logEvent(1)], io);
  assert.strictEqual(io.emitted.length, 1);
  assert.strictEqual(io.emitted[0].room, 'session:abc');
  assert.strictEqual(io.emitted[0].ev, 'session:logs');
  assert.strictEqual(io.emitted[0].payload.sessionId, 'abc');
});

test('ring buffer keeps 500 newest and counts dropped', () => {
  const hub = new SessionLogHub();
  const events = [];
  for (let i = 1; i <= 700; i++) events.push(logEvent(i));
  const res = hub.ingest('s', events, null);
  assert.strictEqual(res.accepted, 700);
  const h = hub.history('s');
  assert.strictEqual(h.events.length, 500);
  assert.strictEqual(h.events[0].seq, 201);       // drop-oldest
  assert.strictEqual(h.events[499].seq, 700);
  assert.strictEqual(h.dropped, 200);
});

test('invalid events rejected without killing the batch', () => {
  const hub = new SessionLogHub();
  const res = hub.ingest('s', [logEvent(1), logEvent(2, { level: 'nope' }), logEvent(3)], null);
  assert.strictEqual(res.accepted, 2);
  assert.strictEqual(res.rejected.length, 1);
  assert.strictEqual(res.rejected[0].index, 1);
});

test('sessionId from envelope overrides event body', () => {
  const hub = new SessionLogHub();
  hub.ingest('real', [logEvent(1, { sessionId: 'spoofed' })], null);
  assert.strictEqual(hub.history('real').events[0].sessionId, 'real');
});

test('history for unknown session is empty, not an error', () => {
  const hub = new SessionLogHub();
  const h = hub.history('nope');
  assert.strictEqual(h.exists, false);
  assert.deepStrictEqual(h.events, []);
});

test('evicts oldest session past maxSessions', () => {
  const hub = new SessionLogHub({ maxSessions: 3 });
  for (const id of ['a', 'b', 'c', 'd']) hub.ingest(id, [logEvent(1)], null);
  assert.strictEqual(hub.sessions.size, 3);
  assert.strictEqual(hub.history('a').exists, false);
  assert.strictEqual(hub.history('d').exists, true);
});

test('stats aggregates sessions', () => {
  const hub = new SessionLogHub();
  hub.ingest('a', [logEvent(1), logEvent(2)], null);
  hub.ingest('b', [logEvent(1)], null);
  assert.deepStrictEqual(hub.stats(), { sessions: 2, totalEvents: 3, totalDropped: 0 });
});

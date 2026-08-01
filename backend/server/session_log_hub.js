/**
 * Session Log Hub
 * ---------------
 * Nhận batch log/status event từ Python LogStreamer (POST /api/logs/stream),
 * giữ ring buffer 500 event mỗi session (để client join muộn có history),
 * và broadcast vào room `session:<sessionId>` qua socket.io.
 *
 * Ràng buộc theo quyết định PM:
 *  - GIỮ NGUYÊN `seq` từ Python, không đánh số lại.
 *  - Ring buffer 500 event/session, drop-oldest, đếm dropped.
 *  - Emit theo room `session:<sessionId>`, KHÔNG io.emit toàn cục.
 */

'use strict';

const MAX_BUFFER = 500;
const MAX_SESSIONS = 100;

const VALID_TYPES = new Set(['log', 'status']);
const VALID_SOURCES = new Set(['opencode', 'freebuff', 'orchestrator']);
const VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error']);
const VALID_STATES = new Set(['spawned', 'running', 'exited']);

class SessionLogHub {
  constructor({ maxBuffer = MAX_BUFFER, maxSessions = MAX_SESSIONS } = {}) {
    this.maxBuffer = maxBuffer;
    this.maxSessions = maxSessions;
    /** @type {Map<string, {events: object[], dropped: number, updatedAt: number}>} */
    this.sessions = new Map();
  }

  /** Validate 1 event theo schema T2. Trả về null nếu hợp lệ, string lỗi nếu không. */
  static validateEvent(ev) {
    if (!ev || typeof ev !== 'object') return 'event must be an object';
    if (!VALID_TYPES.has(ev.type)) return `invalid type: ${ev.type}`;
    if (!VALID_SOURCES.has(ev.source)) return `invalid source: ${ev.source}`;
    if (!Number.isInteger(ev.seq)) return 'seq must be an integer';
    if (typeof ev.ts !== 'number') return 'ts must be a number';
    if (ev.type === 'log') {
      if (ev.stream !== 'stdout' && ev.stream !== 'stderr') {
        return `invalid stream: ${ev.stream}`;
      }
      if (!VALID_LEVELS.has(ev.level)) return `invalid level: ${ev.level}`;
      if (typeof ev.text !== 'string') return 'text must be a string';
    } else {
      if (!VALID_STATES.has(ev.state)) return `invalid state: ${ev.state}`;
    }
    return null;
  }

  _session(sessionId) {
    let s = this.sessions.get(sessionId);
    if (!s) {
      // Evict session cũ nhất nếu vượt trần (chống memory leak)
      if (this.sessions.size >= this.maxSessions) {
        let oldestKey = null;
        let oldestAt = Infinity;
        for (const [k, v] of this.sessions) {
          if (v.updatedAt < oldestAt) { oldestAt = v.updatedAt; oldestKey = k; }
        }
        if (oldestKey !== null) this.sessions.delete(oldestKey);
      }
      s = { events: [], dropped: 0, updatedAt: Date.now() };
      this.sessions.set(sessionId, s);
    }
    return s;
  }

  /**
   * Nạp batch event vào buffer + broadcast.
   * @returns {{accepted: number, rejected: {index:number, reason:string}[], dropped:number}}
   */
  ingest(sessionId, events, io) {
    const s = this._session(sessionId);
    const accepted = [];
    const rejected = [];

    events.forEach((ev, index) => {
      const reason = SessionLogHub.validateEvent(ev);
      if (reason) { rejected.push({ index, reason }); return; }
      // sessionId trên đường truyền là nguồn sự thật; seq giữ nguyên từ Python
      accepted.push({ ...ev, sessionId });
    });

    for (const ev of accepted) {
      s.events.push(ev);
      if (s.events.length > this.maxBuffer) {
        s.events.shift();
        s.dropped += 1;
      }
    }
    s.updatedAt = Date.now();

    if (io && accepted.length > 0) {
      io.to(`session:${sessionId}`).emit('session:logs', {
        sessionId,
        events: accepted,
        dropped: s.dropped
      });
    }

    return { accepted: accepted.length, rejected, dropped: s.dropped };
  }

  /** History cho client join muộn. */
  history(sessionId, limit = MAX_BUFFER) {
    const s = this.sessions.get(sessionId);
    if (!s) return { sessionId, events: [], dropped: 0, exists: false };
    return {
      sessionId,
      events: s.events.slice(-limit),
      dropped: s.dropped,
      exists: true
    };
  }

  clear(sessionId) {
    return this.sessions.delete(sessionId);
  }

  stats() {
    return {
      sessions: this.sessions.size,
      totalEvents: [...this.sessions.values()]
        .reduce((n, s) => n + s.events.length, 0),
      totalDropped: [...this.sessions.values()]
        .reduce((n, s) => n + s.dropped, 0)
    };
  }
}

module.exports = { SessionLogHub, MAX_BUFFER };

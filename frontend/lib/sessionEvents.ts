/**
 * sessionEvents — Wire contract của `session:logs` (socket.io).
 *
 * Source of truth: backend/server/session_log_hub.js → SessionLogHub.validateEvent()
 * KHÔNG thêm field nào không có trong validateEvent().
 *
 * BUG-T5-001: `seq` là monotonic trong phạm vi MỘT RUN CLI, KHÔNG phải per-session.
 * Một session chứa nhiều run nối tiếp → `seq` LẶP LẠI giữa các run.
 *  - CẤM lọc `seq <= lastSeq` (sẽ nuốt sạch run thứ 2 trở đi).
 *  - Nhận biết run mới qua `status/spawned` HOẶC `seq` tụt.
 *  - React key phải là `${runIndex}-${seq}`, không được dùng `seq` đơn lẻ.
 */

export type EventType = 'log' | 'status';
export type EventSource = 'opencode' | 'freebuff' | 'orchestrator';
export type EventLevel = 'debug' | 'info' | 'warn' | 'error';
export type EventStream = 'stdout' | 'stderr';
export type EventState = 'spawned' | 'running' | 'exited';

export interface SessionLogEvent {
  type: 'log';
  source: EventSource;
  seq: number;
  ts: number;
  stream: EventStream;
  level: EventLevel;
  text: string;
}

export interface SessionStatusEvent {
  type: 'status';
  source: EventSource;
  seq: number;
  ts: number;
  state: EventState;
  exitCode?: number | null;
  [k: string]: unknown;
}

export type SessionEvent = SessionLogEvent | SessionStatusEvent;

/** Event sau khi gán runIndex ở client. `key` dùng trực tiếp làm React key. */
export type IndexedEvent = SessionEvent & { runIndex: number; key: string };

export function isLog(ev: SessionEvent): ev is SessionLogEvent {
  return ev.type === 'log';
}

/**
 * Gán runIndex cho chuỗi event.
 * Run mới khi: gặp `status/spawned`, HOẶC `seq` tụt so với seq lớn nhất của run hiện tại.
 * Dedupe CHỈ trong phạm vi một run (cùng runIndex + seq + type).
 */
export function indexEvents(events: SessionEvent[]): IndexedEvent[] {
  const out: IndexedEvent[] = [];
  let runIndex = 0;
  let lastSeq = -Infinity;
  let seenInRun = new Set<string>();
  let started = false;

  for (const ev of events) {
    const isSpawn = ev.type === 'status' && (ev as SessionStatusEvent).state === 'spawned';
    const seqDropped = ev.seq < lastSeq;

    if ((isSpawn && started) || seqDropped) {
      runIndex += 1;
      seenInRun = new Set<string>();
      lastSeq = -Infinity;
    }
    started = true;

    const dedupeKey = `${ev.type}:${ev.seq}`;
    if (seenInRun.has(dedupeKey)) continue;
    seenInRun.add(dedupeKey);

    lastSeq = Math.max(lastSeq, ev.seq);
    // key gồm cả type: status và log có thể trùng seq trong cùng run.
    out.push({ ...(ev as SessionEvent), runIndex, key: `${runIndex}-${ev.type}-${ev.seq}` } as IndexedEvent);
  }
  return out;
}

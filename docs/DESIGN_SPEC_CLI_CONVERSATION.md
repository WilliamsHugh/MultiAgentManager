# DESIGN SPEC — CLI Conversation View (T3)

Trạng thái: **DRAFT — chờ T2 chốt schema event runtime.** Spec này bám schema
đã tồn tại trong `backend/server/session_log_hub.js` (validateEvent), KHÔNG tự chế field.

## 1. Schema nguồn (đọc từ code, chưa phải T2 xác nhận)

| field | giá trị hợp lệ |
|---|---|
| `type` | `log` \| `status` |
| `source` | `opencode` \| `freebuff` \| `orchestrator` |
| `seq` | integer — **per-run**, reset mỗi run, KHÔNG monotonic theo session |
| `ts` | number |
| `stream` (type=log) | `stdout` \| `stderr` |
| `level` (type=log) | `debug` \| `info` \| `warn` \| `error` |
| `text` (type=log) | string |
| `state` (type=status) | `spawned` \| `running` \| `exited` |

Ràng buộc consumer:
- **CẤM** lọc `seq <= lastSeq` (nuốt run thứ 2 trở đi).
- Run mới nhận biết qua `status/spawned` (hoặc `seq` tụt) → tăng `runIndex`.
- React key = `` `${runIndex}-${type}-${seq}` `` (`type` bắt buộc: `status` và `log` dùng chung dải `seq` trong một run → thiếu `type` sẽ va key). PM đã duyệt.
- `stderr` mặc định `level:"warn"` — hiển thị amber, **không** phải error.

## 2. Gap hiện tại trong FE (đã xác minh bằng grep)

1. `frontend/lib/socket.ts:12` — `LogEntry` chỉ có `{taskId, level, message, timestamp}`;
   thiếu `seq/ts/type/source/stream/state`. Cần type mới `SessionEvent`.
2. `frontend/components/logs/LogEntry.tsx:15` — level union là
   `info|success|warn|error`, backend là `debug|info|warn|error`. **Lệch**: thiếu
   `debug`, thừa `success`.
3. `frontend/components/logs/LogViewer.tsx:101` — `key={i}` (index) → **vi phạm
   contract**, phải đổi sang `${runIndex}-${seq}`.
4. Không có chỗ nào trong FE tham chiếu `runIndex` → chưa có run grouping.

## 3. Thiết kế hiển thị

### 3.1 Run separator
Mỗi `status/spawned` render một divider:
```
──────── RUN #2 · opencode · 14:03:21 ────────
```
- màu `text-slate-500`, border-top `slate-800`, `text-[10px] uppercase tracking-wider`.
- `state:"exited"` render divider đóng, hiện exit badge (emerald nếu code 0, red nếu ≠0).

### 3.2 Token màu (giữ brand hiện có)
| level | text | badge |
|---|---|---|
| debug | `text-slate-500` | `text-slate-600` |
| info | `text-slate-300` | `text-iris-400` |
| warn (bao gồm stderr) | `text-amber-300` | `text-amber-400` |
| error | `text-red-300` | `text-red-400` |

`stderr` thêm dấu hiệu phụ: prefix `⟩` màu amber-500/70 — phân biệt stream mà
không nâng mức nghiêm trọng.

### 3.3 Layout dòng
```
[hh:mm:ss] [SOURCE] [LEVEL] text
```
- timestamp `text-slate-600 text-[11px]` — có thể tắt.
- `source` chip: opencode = iris, orchestrator = slate, freebuff = violet.
- font `font-mono text-xs leading-relaxed`, nền `bg-slate-950`.
- text giữ whitespace: `whitespace-pre-wrap break-words` (output CLI có indent/ANSI-stripped).

### 3.4 FloatingWindow
- Header hiện: tên task · badge trạng thái run hiện tại · counter `N events`.
- Nếu hub báo `dropped > 0`: banner amber trên đầu list
  `⚠ Đã bỏ M dòng cũ (ring buffer 500/session)`.
- Auto-scroll: bám đáy; user scroll lên >40px → tạm dừng + nút "Jump to latest".
- Min size 420×280, resize theo grid 8px.

## 4. A11y (WCAG AA)
- Danh sách log: `role="log" aria-live="polite" aria-relevant="additions"`.
- Không dùng màu làm tín hiệu duy nhất → luôn có nhãn text `[WARN]`, `[ERROR]`.
- Contrast: amber-300/slate-950 ≈ 9.8:1, red-300 ≈ 7.5:1, slate-500 ≈ 4.9:1 — đạt AA.
- Divider run là `<h3 class="sr-only">Run 2</h3>` + phần trang trí `aria-hidden`.
- Focus ring `ring-2 ring-iris-400` trên nút control; toàn bộ control có `aria-label`.

## 5. DoD cho phần implement (Dev Agent)
- [ ] Thêm type `SessionEvent` khớp bảng §1.
- [ ] `runIndex` derive từ `status/spawned` trong reducer, KHÔNG lọc theo seq.
- [ ] Thay `key={i}` bằng `${runIndex}-${type}-${seq}`.
- [ ] Thêm `debug`, bỏ/ánh xạ `success`.
- [ ] Render divider run + banner dropped.

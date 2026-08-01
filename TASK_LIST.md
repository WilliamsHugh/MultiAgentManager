# TASK_LIST — Milestone: CLI Bridge + Live Log Window

> PM verified 01/08 bằng tool thật, không dựa vào self-report của agent.
> Rule quota: hết quota / rate-limit → DỪNG ngay, báo cáo 1 lần cuối, KHÔNG retry spam.
> Rule git: commit local trên branch/worktree riêng. KHÔNG push. Hugh tự push.

## 0. Kết quả TEST KẾT NỐI (PM đã chạy, đây là fact)

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| opencode present | `opencode --version` | ✅ `1.18.10` |
| freebuff present | `freebuff --version` | ✅ `0.0.135` |
| opencode headless E2E | `opencode run "reply with exactly: PIPELINE_OK"` | ✅ trả về `PIPELINE_OK`, model `deepseek-v4-flash-free`, exit 0 |
| freebuff headless | `freebuff "reply PIPELINE_OK"` | ❌ `error: command-argument value ... is invalid for argument 'command'. Allowed choices are login.` |

**BLOCKER #1 (P0):** `freebuff` v0.0.135 chỉ có TUI interactive + subcommand `login`. Nó **không nhận prompt qua argv**. Options duy nhất: `--continue`, `--cwd`, `-v`, `-h`.
→ `backend/core/freebuff_wrapper.py::analyze_request()` gọi `subprocess.run([freebuff_path, prompt])` ⇒ **luôn fail**. Orchestrator Step 1 (planning) hiện không thể chạy.
→ Ngoài ra freebuff TUI in escape-code/spinner (`Connecting…`) + banner quảng cáo ⇒ stdout không parse JSON được.

**Định hướng PM:** opencode là đường sống. Pipeline v1 chạy **opencode-only** (planner + worker đều là `opencode run`), freebuff hạ xuống adapter optional sau khi dev tìm được chế độ headless (hoặc PTY-drive).

---

## T1 — dev-agent (P0) — Freebuff adapter + headless mode
- **DoD:**
  - Xác minh freebuff có mode non-TUI không (đọc bundle trong `~/.nvm/.../lib/node_modules`, env var, stdin pipe, `--continue`). Báo cáo YES/NO kèm bằng chứng.
  - Nếu NO → refactor `FreebuffWrapper` thành interface `PlannerBackend` với 2 impl: `OpencodePlanner` (dùng `opencode run`, mặc định) và `FreebuffPlanner` (raise `NotSupported` + lý do).
  - `orchestrator.py` chọn planner qua config/env `PLANNER_BACKEND` (default `opencode`).
  - Strip ANSI escape khỏi mọi stdout capture.
- **Verify:** `python backend/core/orchestrator.py` với 1 task nhỏ chạy end-to-end, không exception.

## T2 — dev-agent (P0) — WebSocket log stream schema + spawn
- **DoD:**
  - Định nghĩa message schema (khoá cố định, dev không tự đổi tên sau này):
    ```json
    {"type":"log","sessionId":"str","source":"opencode|freebuff|orchestrator",
     "taskId":"str|null","stream":"stdout|stderr","level":"info|warn|error",
     "seq":123,"ts":"ISO8601","text":"..."}
    ```
    + `{"type":"status","sessionId","source","state":"spawned|running|exited","exitCode":n}`
  - Backend spawn CLI bằng `Popen(..., bufsize=1, text=True)`, 2 thread đọc stdout/stderr, đẩy vào WS broadcast. `seq` tăng đơn điệu per session.
  - Endpoint `ws://<host>/ws/logs?sessionId=...`; ring buffer ≥ 500 dòng cuối để client join muộn vẫn thấy history.
  - Backpressure: drop-oldest, KHÔNG unbounded queue.
- **Verify:** `wscat`/script test nhận được ≥1 `status:spawned`, N `log`, 1 `status:exited` cho task `opencode run "reply PIPELINE_OK"`.
- **Depends:** none (schema làm trước, T1 song song).

## T3 — ux-agent (P1) — Floating log window UI
- **DoD:**
  - Tái dùng `frontend/components/canvas/FloatingWindow.tsx` + `frontend/components/logs/LogViewer.tsx`. KHÔNG viết component mới trùng chức năng.
  - 1 window / CLI source (opencode, freebuff, orchestrator), tab hoặc cửa sổ riêng — chọn 1, ghi rõ lý do.
  - Yêu cầu: auto-scroll + nút pause, màu theo `level` (error đỏ / warn vàng), badge trạng thái connected/disconnected, virtualized list (≥5k dòng không lag), nút copy/clear.
  - Consume đúng schema T2, không tự chế field.
- **Depends:** T2 schema (chỉ cần schema, không cần backend chạy — mock trước).
- **Pitfall đã biết:** FloatingWindow từng crash khi drag (fix ở `7be7eac`, RAF throttle + zIndex closure). Đừng regress.

## T4 — devops-agent (P2) — CI cho CLI connectivity
- **DoD:**
  - Script `scripts/check_cli_bridge.sh`: kiểm tra `opencode --version`, `freebuff --version`, chạy smoke `opencode run` với timeout, exit code rõ ràng.
  - Thêm job vào CI; job smoke gọi LLM phải là **non-blocking / allow-failure** (quota có thể hết) và log lý do skip thay vì fail đỏ giả.
  - Node pin v24.14.0, PATH nvm bin.
- **Pitfall:** Node v24 — `node --test tests/` (thư mục) MODULE_NOT_FOUND, phải glob `tests/*.js`.

## T5 — qa-agent (P2) — E2E verify
- **DoD:** kịch bản E2E: mở dashboard → trigger 1 task → thấy log opencode chảy realtime trong FloatingWindow → task exit → window hiện exit code. Kèm ảnh/log bằng chứng.
- **Ngoài ra test:** WS reconnect khi backend restart; client join giữa chừng vẫn thấy buffer; CLI exit lỗi hiển thị đúng `level:error`.
- **Depends:** T2 + T3.

---

## Thứ tự & ưu tiên
1. T2 (schema) → công bố cho cả team, block ít nhất.
2. T1 song song với T2.
3. T3 sau khi có schema (mock data).
4. T4 song song bất kỳ lúc nào.
5. T5 cuối, sau T2+T3 merge.

## Escalate về PM ngay nếu
- Freebuff không có headless mode nào khả thi (⇒ PM chốt bỏ freebuff khỏi v1).
- Quota/rate-limit LLM → dừng, báo 1 lần.
- Cần đổi schema T2 sau khi đã công bố.

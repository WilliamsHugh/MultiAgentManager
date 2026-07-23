# 🛡️ Phase 2.2: Backend Security Hardening

**Worktree:** `wt_security`
**Branch:** `phase/2.2-security`
**Target dirs:** `backend/server/`
**Based on commit:** `05cb0ad` (Phase 2.1)

---

## 🎯 Mục Tiêu

Tăng cường bảo mật và độ tin cậy cho Backend Server (Node.js/Express).

## 📋 Nhiệm Vụ Chi Tiết

### Task 1: Input Validation (express-validator)

**File:** `backend/server/server.js`

**Rules:**
- Thêm `const { body, query, param, validationResult } = require('express-validator');`
- Cài đặt package: `npm install express-validator`
- Tạo middleware helper `validate` ở đầu file:
```javascript
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
  };
};
```

**Các endpoint cần validate:**

1. `POST /api/projects`:
   - `name`: `body('name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 100 })`

2. `POST /api/tasks`:
   - `projectId`: `body('projectId').isUUID().withMessage('Invalid project ID')`
   - `name`: `body('name').trim().notEmpty().isLength({ max: 200 })`
   - `description`: `body('description').optional().trim().isLength({ max: 2000 })`
   - `prompt`: `body('prompt').trim().notEmpty().isLength({ max: 10000 })`

3. `PUT /api/tasks/:id/status`:
   - `id` param: `param('id').isUUID()`
   - `status`: `body('status').isIn(['pending', 'running', 'done', 'error'])`
   - `exit_code`: `body('exit_code').optional().isInt()`

4. `POST /api/worktrees`:
   - `task_id`: `body('task_id').isUUID()`
   - `path`: `body('path').trim().notEmpty()`
   - `branch_name`: `body('branch_name').trim().notEmpty()`

5. `GET /api/tasks/:id/logs`:
   - `limit`: `query('limit').optional().isInt({ min: 1, max: 1000 })`
   - `offset`: `query('offset').optional().isInt({ min: 0 })`

### Task 2: Rate Limiting

**File:** `backend/server/server.js`

**Rules:**
- Thêm `npm install express-rate-limit`
- Tạo 2 rate limiters:

```javascript
const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Strict limiter for task submission
const submitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many task submissions, please slow down' }
});
```

- Apply `apiLimiter` to `/api/` routes
- Apply `submitLimiter` to `POST /api/tasks` and `POST /api/projects`

### Task 3: CORS Hardening

**File:** `backend/server/server.js`

**Rules:**
- Thay đổi CORS config từ cho phép origin mặc định thành chỉ cho phép origin đã cấu hình:

```javascript
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) 
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
```

### Task 4: Fix npm audit

```bash
cd backend/server && npm audit fix
```

Kiểm tra và ghi nhận kết quả.

---

## 🧪 Kiểm Tra

Sau khi hoàn thành, chạy:
```bash
cd /home/hughwilliams/projects/MultiAgentManager/backend/server
npm test
```

Tất cả 39 tests phải pass. Không có deprecation warnings.

## 🔗 Phụ Thuộc

- Độc lập với các worktree khác
- Chỉ sửa files trong `backend/server/`

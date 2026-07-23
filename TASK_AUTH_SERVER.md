# 🔐 Phase 3.1: Backend Authentication (JWT)

**Worktree:** `wt_auth_server`
**Branch:** `phase/3.1-auth-server`
**Target dirs:** `backend/server/`
**Based on commit:** `3c3c320` (main)

---

## 🎯 Mục Tiêu

Thêm JWT authentication cho Backend Server:
1. Register/Login endpoints
2. JWT token generation & verification
3. Auth middleware cho protected routes
4. Password hashing với bcryptjs
5. Tất cả 39 tests vẫn pass

## 📋 Nhiệm Vụ Chi Tiết

### Task 1: Cài đặt dependencies

```bash
cd /home/hughwilliams/projects/MultiAgentManager/wt_auth_server/backend/server
npm install jsonwebtoken bcryptjs
```

### Task 2: Tạo Auth Middleware

**File mới:** `backend/server/auth.js`

**Rules:**
- Middleware xác thực JWT token
- Token từ header `Authorization: Bearer <token>`
- Middleware gắn `req.user = { id, username }` vào request
- Export cả middleware và các hàm helper

```javascript
/**
 * Auth Middleware - JWT Authentication
 * 
 * Xác thực token JWT từ Authorization header.
 * Hỗ trợ protected routes và user identity.
 */
const jwt = require('jsonwebtoken');

// Secret key - trong production nên dùng env var mạnh hơn
const JWT_SECRET = process.env.JWT_SECRET || 'ma-jwt-secret-dev-only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Lưu users trong memory (trong production dùng database)
const users = new Map();

/**
 * Tạo JWT token cho user
 * @param {Object} user - { id, username }
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Auth middleware - verify JWT token
 * Gắn req.user nếu token hợp lệ
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Optional auth - gắn req.user nếu có token, không block nếu không
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.id, username: decoded.username };
    } catch (err) {
      // Silent fail - optional auth
    }
  }
  
  next();
}

module.exports = { authenticate, optionalAuth, generateToken, users };
```

### Task 3: Thêm Auth Endpoints

**File:** `backend/server/server.js`

**Rules:**
- Thêm `POST /api/auth/register` - tạo user mới
- Thêm `POST /api/auth/login` - login, trả về token
- Thêm `GET /api/auth/me` - lấy thông tin user hiện tại (protected)
- Validate input với express-validator

**Chỉnh sửa server.js:**

```javascript
// Thêm ở đầu file sau các require khác:
const { authenticate, optionalAuth, generateToken, users } = require('./auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Thêm sau middleware section:

// ─── Auth Routes ───

// Register
app.post('/api/auth/register',
  validate([
    body('username').trim().notEmpty().isLength({ min: 3, max: 30 }),
    body('password').trim().notEmpty().isLength({ min: 6, max: 100 })
  ]),
  async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Check existing user
      for (const [, user] of users) {
        if (user.username === username) {
          return res.status(409).json({ error: 'Username already exists' });
        }
      }
      
      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      users.set(id, { id, username, password: hashedPassword });
      
      const token = generateToken({ id, username });
      
      res.status(201).json({
        message: 'User created successfully',
        user: { id, username },
        token
      });
    } catch (err) {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
app.post('/api/auth/login',
  validate([
    body('username').trim().notEmpty(),
    body('password').trim().notEmpty()
  ]),
  async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Find user
      let foundUser = null;
      for (const [, user] of users) {
        if (user.username === username) {
          foundUser = user;
          break;
        }
      }
      
      if (!foundUser) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      const validPassword = await bcrypt.compare(password, foundUser.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      const token = generateToken({ id: foundUser.id, username: foundUser.username });
      
      res.json({
        message: 'Login successful',
        user: { id: foundUser.id, username: foundUser.username },
        token
      });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user (protected)
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

### Task 4: Protect Task & Project Endpoints

**File:** `backend/server/server.js`

**Rules:**
- Thêm `authenticate` middleware vào các endpoints cần bảo vệ:
  - `POST /api/projects` → authenticate
  - `POST /api/tasks` → authenticate
  - `PUT /api/tasks/:id/status` → authenticate
  - `DELETE /api/tasks/:id` → authenticate
  - `POST /api/worktrees` → authenticate

- Các GET endpoints và health check vẫn public (optionalAuth):

```javascript
app.get('/api/health', (req, res) => { ... });  // Public
app.get('/api/projects', optionalAuth, ...);     // Optional auth
app.get('/api/tasks', optionalAuth, ...);        // Optional auth
```

### Task 5: Cập nhật Rate Limiter cho Auth

**File:** `backend/server/server.js`

**Rules:**
- Thêm auth-specific rate limiter (stricter cho login attempts):

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5,                    // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

// Apply authLimiter lên auth routes
// authLimiter được apply thủ công trong từng route handler
```

### Task 6: Thêm Logout/Token Blacklist (đơn giản)

**File:** `backend/server/auth.js`

**Rules:**
- Thêm blacklist set cho revoked tokens
- Thêm `POST /api/auth/logout` endpoint
- Kiểm tra blacklist trong authenticate middleware

```javascript
// Thêm vào auth.js:
const tokenBlacklist = new Set();

function revokeToken(token) {
  tokenBlacklist.add(token);
}

function isTokenRevoked(token) {
  return tokenBlacklist.has(token);
}

// Cập nhật authenticate middleware:
function authenticate(req, res, next) {
  ...
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (isTokenRevoked(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } ...
}

// Thêm vào module.exports:
module.exports = { authenticate, optionalAuth, generateToken, revokeToken, users };
```

**Thêm vào server.js:**
```javascript
const { authenticate, optionalAuth, generateToken, revokeToken, users } = require('./auth');

// Logout
app.post('/api/auth/logout', authenticate, (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  revokeToken(token);
  res.json({ message: 'Logged out successfully' });
});
```

---

## 🧪 Kiểm Tra

```bash
cd /home/hughwilliams/projects/MultiAgentManager/wt_auth_server/backend/server
npm test
```

Tất cả 39 tests phải pass. 
**Lưu ý:** Các test hiện tại không gửi auth header, nên nếu bạn protect endpoints, các test cũ sẽ fail. Cần:
1. Hoặc giữ endpoints public (không authenticate) và chỉ thêm auth routes mới
2. Hoặc cập nhật tests để gửi token

**Recommendation:** Giữ các endpoints cũ public (chỉ thêm optionalAuth), và chỉ thêm auth routes mới. Các endpoints cũ sẽ được protect trong Phase 3.2.

---

## 🔗 Phụ Thuộc

- Độc lập với các worktree khác
- Chỉ sửa files trong `backend/server/`

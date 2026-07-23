/**
 * Auth Middleware - JWT Authentication
 *
 * Xác thực token JWT từ Authorization header.
 * Hỗ trợ protected routes, optional auth, và token blacklist.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ma-jwt-secret-dev-only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// In-memory user store (production: dùng database)
const users = new Map();

// Revoked tokens blacklist
const tokenBlacklist = new Set();

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
 * Revoke a token (logout)
 * @param {string} token - JWT token to revoke
 */
function revokeToken(token) {
  tokenBlacklist.add(token);
}

/**
 * Check if token is revoked
 * @param {string} token
 * @returns {boolean}
 */
function isTokenRevoked(token) {
  return tokenBlacklist.has(token);
}

/**
 * Auth middleware - bắt buộc có token hợp lệ
 * Gắn req.user = { id, username } nếu thành công
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (isTokenRevoked(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

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

      if (!isTokenRevoked(token)) {
        req.user = { id: decoded.id, username: decoded.username };
      }
    } catch (err) {
      // Silent fail - optional auth
    }
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  generateToken,
  revokeToken,
  users
};

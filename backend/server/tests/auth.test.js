/**
 * Unit tests cho backend/server/auth.js (P4-2)
 *
 * Phủ 5 hàm export: generateToken, revokeToken, isTokenRevoked,
 * authenticate, optionalAuth — bao gồm nhánh lỗi 401 và token hết hạn.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const {
  generateToken,
  revokeToken,
  isTokenRevoked,
  authenticate,
  optionalAuth,
  _clearBlacklist
} = require('../auth');

const JWT_SECRET = process.env.JWT_SECRET || 'ma-jwt-secret-dev-only';
const USER = { id: 'u1', username: 'alice' };

/** Tạo res giả ghi lại statusCode + body */
function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

/** Tạo req giả với authorization header tuỳ chọn */
function mockReq(authHeader) {
  return { headers: authHeader ? { authorization: authHeader } : {} };
}

describe('auth.generateToken', () => {
  test('trả về JWT chứa id và username', () => {
    const token = generateToken(USER);
    assert.strictEqual(typeof token, 'string');
    const decoded = jwt.verify(token, JWT_SECRET);
    assert.strictEqual(decoded.id, 'u1');
    assert.strictEqual(decoded.username, 'alice');
  });

  test('token có claim exp (hết hạn)', () => {
    const decoded = jwt.decode(generateToken(USER));
    assert.ok(decoded.exp > decoded.iat, 'exp phải lớn hơn iat');
  });

  test('hai user khác nhau sinh token khác nhau', () => {
    const a = generateToken({ id: 'u1', username: 'alice' });
    const b = generateToken({ id: 'u2', username: 'bob' });
    assert.notStrictEqual(a, b);
  });
});

describe('auth.revokeToken / isTokenRevoked', () => {
  beforeEach(() => _clearBlacklist());

  test('token mới chưa bị revoke', () => {
    assert.strictEqual(isTokenRevoked(generateToken(USER)), false);
  });

  test('sau revoke thì isTokenRevoked trả true', () => {
    const token = generateToken(USER);
    revokeToken(token);
    assert.strictEqual(isTokenRevoked(token), true);
  });

  test('revoke token này không ảnh hưởng token khác', () => {
    const a = generateToken({ id: 'u1', username: 'alice' });
    const b = generateToken({ id: 'u2', username: 'bob' });
    revokeToken(a);
    assert.strictEqual(isTokenRevoked(a), true);
    assert.strictEqual(isTokenRevoked(b), false);
  });

  test('revoke hai lần vẫn idempotent', () => {
    const token = generateToken(USER);
    revokeToken(token);
    revokeToken(token);
    assert.strictEqual(isTokenRevoked(token), true);
  });
});

describe('auth.authenticate', () => {
  beforeEach(() => _clearBlacklist());

  test('401 khi thiếu authorization header', () => {
    const res = mockRes();
    let called = false;
    authenticate(mockReq(), res, () => { called = true; });
    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /Missing or invalid/);
    assert.strictEqual(called, false);
  });

  test('401 khi header không có prefix Bearer', () => {
    const res = mockRes();
    authenticate(mockReq('Basic abc123'), res, () => {});
    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /Missing or invalid/);
  });

  test('401 khi token không hợp lệ', () => {
    const res = mockRes();
    authenticate(mockReq('Bearer not-a-real-token'), res, () => {});
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Invalid token');
  });

  test('401 khi token đã hết hạn', () => {
    const expired = jwt.sign({ id: 'u1', username: 'alice' }, JWT_SECRET, { expiresIn: '-1s' });
    const res = mockRes();
    authenticate(mockReq(`Bearer ${expired}`), res, () => {});
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Token expired');
  });

  test('401 khi token đã bị revoke', () => {
    const token = generateToken(USER);
    revokeToken(token);
    const res = mockRes();
    authenticate(mockReq(`Bearer ${token}`), res, () => {});
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Token has been revoked');
  });

  test('token hợp lệ: gọi next() và gắn req.user', () => {
    const req = mockReq(`Bearer ${generateToken(USER)}`);
    const res = mockRes();
    let called = false;
    authenticate(req, res, () => { called = true; });
    assert.strictEqual(called, true);
    assert.strictEqual(res.statusCode, null, 'không được gửi response lỗi');
    assert.deepStrictEqual(req.user, { id: 'u1', username: 'alice' });
  });

  test('token ký bằng secret khác bị từ chối', () => {
    const foreign = jwt.sign({ id: 'u9', username: 'mallory' }, 'wrong-secret');
    const res = mockRes();
    authenticate(mockReq(`Bearer ${foreign}`), res, () => {});
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Invalid token');
  });
});

describe('auth.optionalAuth', () => {
  beforeEach(() => _clearBlacklist());

  test('không có header: vẫn next(), req.user undefined', () => {
    const req = mockReq();
    const res = mockRes();
    let called = false;
    optionalAuth(req, res, () => { called = true; });
    assert.strictEqual(called, true);
    assert.strictEqual(req.user, undefined);
    assert.strictEqual(res.statusCode, null);
  });

  test('token hợp lệ: gắn req.user', () => {
    const req = mockReq(`Bearer ${generateToken(USER)}`);
    let called = false;
    optionalAuth(req, mockRes(), () => { called = true; });
    assert.strictEqual(called, true);
    assert.deepStrictEqual(req.user, { id: 'u1', username: 'alice' });
  });

  test('token hỏng: silent fail, vẫn next() và không có req.user', () => {
    const req = mockReq('Bearer garbage');
    const res = mockRes();
    let called = false;
    optionalAuth(req, res, () => { called = true; });
    assert.strictEqual(called, true);
    assert.strictEqual(req.user, undefined);
    assert.strictEqual(res.statusCode, null, 'optionalAuth không được trả lỗi');
  });

  test('token đã revoke: không gắn req.user nhưng vẫn next()', () => {
    const token = generateToken(USER);
    revokeToken(token);
    const req = mockReq(`Bearer ${token}`);
    let called = false;
    optionalAuth(req, mockRes(), () => { called = true; });
    assert.strictEqual(called, true);
    assert.strictEqual(req.user, undefined);
  });

  test('header sai prefix: bỏ qua, vẫn next()', () => {
    const req = mockReq('Token abc');
    let called = false;
    optionalAuth(req, mockRes(), () => { called = true; });
    assert.strictEqual(called, true);
    assert.strictEqual(req.user, undefined);
  });
});

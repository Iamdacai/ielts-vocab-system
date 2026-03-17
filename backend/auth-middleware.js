const jwt = require('jsonwebtoken');
const { isAdmin } = require('./auth-wechat');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

/**
 * 基础认证中间件 - 验证 JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: '请先登录' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      message: '登录已过期，请重新登录' 
    });
  }
};

/**
 * 管理员认证中间件 - 验证用户是否为管理员
 */
const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ 
        error: 'Permission denied',
        message: '需要管理员权限' 
      });
    }
    next();
  });
};

/**
 * 可选认证中间件 - token 存在则验证，不存在则跳过
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }
  next();
};

module.exports = { 
  authenticateToken, 
  requireAdmin,
  optionalAuth,
  JWT_SECRET
};

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ielts_vocab_dev_secret_2026_change_in_production';

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: '请先登录' 
    });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: '登录已过期，请重新登录' 
      });
    }
    
    req.user = user; // 将用户信息附加到请求对象
    next();
  });
};

/**
 * 可选认证中间件 - token 存在则验证，不存在则跳过
 */
const optional = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null; // token 无效时设为 null，不阻止请求
    } else {
      req.user = user;
    }
    next();
  });
};

module.exports = { authenticateToken, optional, JWT_SECRET };

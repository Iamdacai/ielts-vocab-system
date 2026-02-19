const jwt = require('jsonwebtoken');

// JWT 认证中间件
const authenticateToken = (req, res, next) => {
  // 从 Authorization header 获取 token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: '请先登录' 
    });
  }

  try {
    // 验证 token
    const decoded = jwt.verify(token, 'dev_secret');
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

module.exports = { authenticateToken };
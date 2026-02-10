const jwt = require('jsonwebtoken');

/**
 * JWT认证中间件
 * 验证请求头中的Authorization token
 */
const authenticateToken = (req, res, next) => {
  // 开发环境跳过认证（用于测试）
  if (process.env.NODE_ENV === 'development' && !req.headers['authorization']) {
    req.user = { userId: 1, openid: 'test_openid' };
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: '缺少认证令牌' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'dev_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效或已过期' });
    }
    
    req.user = user; // 将用户信息附加到请求对象
    next();
  });
};

module.exports = { authenticateToken };
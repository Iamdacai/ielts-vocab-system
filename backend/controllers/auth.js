const jwt = require('jsonwebtoken');
const { initializeDatabase } = require('../database');

/**
 * 简化版微信小程序登录认证控制器（SQLite版本）
 */
const authenticateWechat = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: '缺少微信登录code' });
    }

    // 模拟openid生成（实际项目中需要调用微信API）
    const openid = `mock_openid_${Date.now()}`;
    
    // 获取数据库连接
    const db = await initializeDatabase();
    
    // 查找或创建用户
    let user = await db.get('SELECT * FROM users WHERE openid = ?', [openid]);
    
    if (!user) {
      // 创建新用户
      const result = await db.run(
        'INSERT INTO users(openid) VALUES(?)',
        [openid]
      );
      user = {
        id: result.lastID,
        openid: openid
      };
      
      // 创建默认配置
      await db.run(
        'INSERT INTO user_configs(user_id) VALUES(?)',
        [user.id]
      );
    }
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, openid: user.openid },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        openid: user.openid
      }
    });
    
  } catch (error) {
    console.error('微信登录失败:', error);
    res.status(500).json({ error: '登录失败，请重试', details: error.message });
  }
};

module.exports = { authenticateWechat };
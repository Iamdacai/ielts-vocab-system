const jwt = require('jsonwebtoken');

/**
 * 简化版微信小程序登录认证控制器（用于测试）
 */
const authenticateWechat = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: '缺少微信登录code' });
    }

    // 模拟用户数据
    const mockUser = {
      id: 1,
      openid: `mock_openid_${Date.now()}`
    };
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: mockUser.id, openid: mockUser.openid },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    res.json({
      token,
      user: mockUser
    });
    
  } catch (error) {
    console.error('微信登录失败:', error);
    res.status(500).json({ error: '登录失败，请重试' });
  }
};

module.exports = { authenticateWechat };
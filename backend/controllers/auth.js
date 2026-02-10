const jwt = require('jsonwebtoken');
const { pool } = require('../database');

/**
 * 微信小程序登录认证控制器
 * 使用微信code换取openid，创建或获取用户
 */
const authenticateWechat = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: '缺少微信登录code' });
    }

    // TODO: 调用微信API获取openid
    // 这里先模拟openid生成
    const openid = `mock_openid_${Date.now()}`;
    
    // 在数据库中查找或创建用户
    const user = await findOrCreateUser(openid);
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, openid: user.openid },
      process.env.JWT_SECRET,
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
    res.status(500).json({ error: '登录失败，请重试' });
  }
};

/**
 * 查找或创建用户
 */
const findOrCreateUser = async (openid) => {
  const client = await pool.connect();
  try {
    // 开启事务
    await client.query('BEGIN');
    
    // 查找用户
    let user = await client.query(
      'SELECT * FROM users WHERE openid = $1',
      [openid]
    );
    
    if (user.rows.length > 0) {
      // 用户已存在
      user = user.rows[0];
    } else {
      // 创建新用户
      const newUser = await client.query(
        'INSERT INTO users(openid) VALUES($1) RETURNING *',
        [openid]
      );
      user = newUser.rows[0];
      
      // 为新用户创建默认配置
      await client.query(
        `INSERT INTO user_configs(user_id) VALUES($1)`,
        [user.id]
      );
    }
    
    await client.query('COMMIT');
    return user;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { authenticateWechat };
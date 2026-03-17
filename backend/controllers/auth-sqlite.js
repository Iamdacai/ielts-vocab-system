const { wechatLogin, updateUserProfile } = require('../auth-wechat');

/**
 * 微信小程序登录认证控制器
 * 使用微信 code 换取 openid 并登录
 */
const authenticateWechat = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: '缺少微信登录 code' });
    }

    // 调用微信登录服务
    const result = await wechatLogin(code);

    res.json(result);

  } catch (error) {
    console.error('微信登录失败:', error.message);
    res.status(401).json({ 
      error: '登录失败',
      message: error.message 
    });
  }
};

/**
 * 更新用户信息（可选，登录后可调用）
 */
const updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nickname, avatarUrl, gender, city, province, country } = req.body;

    await updateUserProfile(userId, {
      nickname,
      avatarUrl,
      gender,
      city,
      province,
      country
    });

    res.json({ success: true, message: '用户信息更新成功' });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新失败' });
  }
};

module.exports = { authenticateWechat, updateUserInfo };

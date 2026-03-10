/**
 * 提醒控制器
 * 管理复习提醒
 */
const db = require('../database');

/**
 * 获取待复习单词数量
 */
async function getDueCount(req, res) {
  const userId = req.user.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    const result = await db.get(`
      SELECT COUNT(*) as count
      FROM word_progress
      WHERE user_id = ?
      AND next_review_date IS NOT NULL
      AND date(next_review_date) <= date(?)
    `, [userId, today.toISOString()]);
    
    res.json({
      count: result ? result.count : 0,
    });
  } catch (error) {
    console.error('获取待复习数量失败:', error);
    res.status(500).json({
      success: false,
      message: '获取待复习数量失败',
    });
  }
}

/**
 * 发送提醒
 */
async function sendReminder(req, res) {
  const userId = req.user.userId;
  const { dueCount, templateId } = req.body;
  
  try {
    // 这里可以集成微信订阅消息
    // 暂时返回成功
    
    res.json({
      success: true,
      message: '提醒已发送',
    });
  } catch (error) {
    console.error('发送提醒失败:', error);
    res.status(500).json({
      success: false,
      message: '发送提醒失败',
    });
  }
}

module.exports = {
  getDueCount,
  sendReminder,
};

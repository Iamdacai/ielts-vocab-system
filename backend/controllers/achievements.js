/**
 * 成就系统控制器
 * 管理成就解锁和查询
 */
const db = require('../database');

/**
 * 获取用户成就
 */
async function getUserAchievements(req, res) {
  const userId = req.user.userId;
  
  try {
    const achievements = await db.all(`
      SELECT * FROM user_achievements
      WHERE user_id = ?
      ORDER BY unlocked_at DESC
    `, [userId]);
    
    res.json(achievements);
  } catch (error) {
    console.error('获取成就失败:', error);
    res.status(500).json({
      success: false,
      message: '获取成就失败',
    });
  }
}

/**
 * 解锁成就
 */
async function unlockAchievement(req, res) {
  const userId = req.user.userId;
  const { achievementId } = req.body;
  
  try {
    // 检查是否已解锁
    const existing = await db.get(`
      SELECT * FROM user_achievements
      WHERE user_id = ? AND achievement_id = ?
    `, [userId, achievementId]);
    
    if (existing) {
      return res.json({
        success: true,
        alreadyUnlocked: true,
      });
    }
    
    // 插入新成就
    await db.run(`
      INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
      VALUES (?, ?, ?)
    `, [userId, achievementId, new Date().toISOString()]);
    
    res.json({
      success: true,
      achievementId,
    });
  } catch (error) {
    console.error('解锁成就失败:', error);
    res.status(500).json({
      success: false,
      message: '解锁成就失败',
    });
  }
}

/**
 * 检查并解锁成就
 */
async function checkAndUnlock(req, res) {
  const userId = req.user.userId;
  const { statistics } = req.body;
  
  try {
    // 成就条件检查逻辑
    const achievementsToUnlock = [];
    
    // 这里可以添加成就检查逻辑
    // 为简化，暂时返回成功
    
    res.json({
      success: true,
      unlocked: achievementsToUnlock,
    });
  } catch (error) {
    console.error('检查成就失败:', error);
    res.status(500).json({
      success: false,
      message: '检查成就失败',
    });
  }
}

module.exports = {
  getUserAchievements,
  unlockAchievement,
  checkAndUnlock,
};

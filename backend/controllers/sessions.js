/**
 * 学习会话控制器
 * 管理学习会话的创建和完成
 */
const db = require('../database');

/**
 * 创建学习会话
 */
async function createSession(req, res) {
  const userId = req.user.userId;
  const { vocabularySet, mode, duration } = req.body;
  
  try {
    const session = {
      userId,
      vocabularySet: vocabularySet || 'ielts-core',
      mode: mode || 'new',
      startTime: new Date().toISOString(),
      plannedDuration: duration || 1800, // 默认 30 分钟
    };
    
    // 这里可以选择是否保存到数据库
    // 目前前端使用 localStorage 存储，后端可选
    
    res.json({
      success: true,
      sessionId: `session_${Date.now()}`,
      session,
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({
      success: false,
      message: '创建会话失败',
    });
  }
}

/**
 * 完成学习会话
 */
async function completeSession(req, res) {
  const userId = req.user.userId;
  const { 
    sessionId, 
    duration, 
    newWords, 
    reviewedWords, 
    masteredWords,
    confirmedDuration 
  } = req.body;
  
  try {
    // 保存学习记录到数据库
    await db.run(`
      INSERT INTO learning_sessions (
        user_id,
        session_id,
        duration,
        new_words,
        reviewed_words,
        mastered_words,
        confirmed_duration,
        start_time,
        end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      sessionId,
      duration,
      newWords || 0,
      reviewedWords || 0,
      masteredWords || 0,
      confirmedDuration ? 1 : 0,
      new Date().toISOString(),
      new Date().toISOString(),
    ]);
    
    res.json({
      success: true,
      message: '会话保存成功',
    });
  } catch (error) {
    console.error('保存会话失败:', error);
    res.status(500).json({
      success: false,
      message: '保存会话失败',
    });
  }
}

/**
 * 获取学习历史
 */
async function getHistory(req, res) {
  const userId = req.user.userId;
  const limit = parseInt(req.query.limit) || 30;
  
  try {
    const sessions = await db.all(`
      SELECT * FROM learning_sessions
      WHERE user_id = ?
      ORDER BY end_time DESC
      LIMIT ?
    `, [userId, limit]);
    
    res.json(sessions);
  } catch (error) {
    console.error('获取历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取历史失败',
    });
  }
}

module.exports = {
  createSession,
  completeSession,
  getHistory,
};

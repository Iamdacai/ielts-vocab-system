/**
 * 复习课管理工具函数
 */

const app = getApp();

/**
 * 获取今日复习课
 */
export function getTodaySession() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiUrl}/review/sessions/today`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: resolve,
      fail: reject
    });
  });
}

/**
 * 提交复习答案
 */
export function submitAnswer(sessionId, wordId, result, stage) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiUrl}/review/sessions/${sessionId}/answer`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json'
      },
      data: {
        wordId,
        result,
        stage
      },
      success: resolve,
      fail: reject
    });
  });
}

/**
 * 获取复习课历史
 */
export function getSessionHistory(days = 7) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiUrl}/review/sessions/history?days=${days}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: resolve,
      fail: reject
    });
  });
}

/**
 * 获取复习课统计
 */
export function getSessionStats() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiUrl}/review/sessions/stats`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: resolve,
      fail: reject
    });
  });
}

/**
 * 格式化复习课状态
 */
export function formatSessionStatus(status) {
  const statusMap = {
    'pending': { text: '未完成', color: '#f59e0b' },
    'in_progress': { text: '进行中', color: '#3b82f6' },
    'completed': { text: '已完成', color: '#22c55e' }
  };
  return statusMap[status] || { text: status, color: '#666' };
}

/**
 * 计算复习课完成率
 */
export function calculateCompletionRate(completed, planned) {
  if (!planned || planned === 0) return 0;
  return Math.round((completed / planned) * 100);
}

export default {
  getTodaySession,
  submitAnswer,
  getSessionHistory,
  getSessionStats,
  formatSessionStatus,
  calculateCompletionRate
};

/**
 * 智能提醒系统 - 微信小程序版
 * 基于遗忘曲线的最佳复习时间提醒
 */

const REMINDER_CONFIG = {
  checkHours: [8, 12, 18, 21], // 检查时间
  minDueWords: 5, // 最少待复习词数
  maxRemindersPerDay: 3, // 每天最多提醒次数
};

/**
 * 获取今日待复习单词数
 */
export async function getTodayDueWordsCount(token, apiUrl) {
  try {
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${apiUrl}/words/review/count`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: resolve,
        fail: reject
      });
    });
    
    if (res.statusCode === 200) {
      return res.data.count || 0;
    }
  } catch (error) {
    console.error('获取待复习单词失败:', error);
  }
  
  return 0;
}

/**
 * 生成提醒消息
 */
export function generateReminderMessage(dueCount) {
  if (dueCount === 0) {
    return {
      title: '🎉 太棒了！',
      body: '今天没有需要复习的单词，继续保持！',
      priority: 'low',
    };
  }
  
  let priority = 'normal';
  let title = '💡 学习提醒';
  
  if (dueCount > 50) {
    priority = 'high';
    title = '⚠️ 紧急提醒';
  } else if (dueCount > 20) {
    priority = 'medium';
    title = '📚 复习提醒';
  }
  
  return {
    title,
    body: `今天有${dueCount}个单词需要复习，花 15 分钟完成吧！`,
    priority,
    dueCount,
  };
}

/**
 * 检查是否需要发送提醒
 */
export function shouldSendReminder() {
  const now = new Date();
  const currentHour = now.getHours();
  
  // 检查是否在提醒时间段
  const isCheckTime = REMINDER_CONFIG.checkHours.includes(currentHour);
  if (!isCheckTime) {
    return { should: false, reason: '不在提醒时间段' };
  }
  
  // 检查今日已发送次数
  const today = now.toDateString();
  const lastReminders = getTodayReminders();
  if (lastReminders.length >= REMINDER_CONFIG.maxRemindersPerDay) {
    return { should: false, reason: '今日已达最大提醒次数' };
  }
  
  // 检查距离上次提醒时间
  if (lastReminders.length > 0) {
    const lastReminder = new Date(lastReminders[lastReminders.length - 1].sentAt);
    const hoursSinceLast = (now - lastReminder) / (1000 * 60 * 60);
    if (hoursSinceLast < 2) {
      return { should: false, reason: '距离上次提醒不足 2 小时' };
    }
  }
  
  return {
    should: true,
    reason: '满足所有提醒条件',
  };
}

/**
 * 记录提醒发送
 */
export function recordReminderSent(message) {
  const storageKey = 'ielts_vocab_reminders';
  
  try {
    const stored = wx.getStorageSync(storageKey);
    const reminders = stored ? JSON.parse(stored) : [];
    
    reminders.push({
      sentAt: new Date().toISOString(),
      message,
    });
    
    // 只保留最近 30 天的记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filtered = reminders.filter(r => 
      new Date(r.sentAt) > thirtyDaysAgo
    );
    
    wx.setStorageSync(storageKey, JSON.stringify(filtered));
  } catch (error) {
    console.error('记录提醒失败:', error);
  }
}

/**
 * 获取今日提醒记录
 */
export function getTodayReminders() {
  const storageKey = 'ielts_vocab_reminders';
  const today = new Date().toDateString();
  
  try {
    const stored = wx.getStorageSync(storageKey);
    if (!stored) return [];
    
    const reminders = JSON.parse(stored);
    return reminders.filter(r => 
      new Date(r.sentAt).toDateString() === today
    );
  } catch (error) {
    console.error('获取提醒记录失败:', error);
    return [];
  }
}

/**
 * 发送订阅消息提醒
 */
export function sendReviewReminder(dueCount) {
  // 请求订阅消息模板
  wx.requestSubscribeMessage({
    tmplIds: ['YOUR_TEMPLATE_ID'], // 需要替换为实际的模板 ID
    success: (res) => {
      if (res[tmplIds[0]] === 'accept') {
        // 用户同意接收，发送提醒
        wx.request({
          url: `${app.globalData.apiUrl}/reminder/send`,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${app.globalData.token}`
          },
          data: {
            dueCount,
            templateId: tmplIds[0]
          }
        });
      }
    }
  });
}

/**
 * 清除提醒记录
 */
export function clearReminderHistory() {
  wx.removeStorageSync('ielts_vocab_reminders');
}

export default {
  REMINDER_CONFIG,
  getTodayDueWordsCount,
  generateReminderMessage,
  shouldSendReminder,
  recordReminderSent,
  getTodayReminders,
  sendReviewReminder,
  clearReminderHistory,
};

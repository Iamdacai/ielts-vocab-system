/**
 * 成就徽章系统 - 微信小程序版
 * 25 个成就徽章，5 种稀有度
 */

// 成就定义
export const ACHIEVEMENTS = {
  // 连续学习类
  'streak_3': {
    id: 'streak_3',
    name: '初出茅庐',
    description: '连续学习 3 天',
    icon: '🌱',
    category: 'streak',
    condition: { type: 'streak', value: 3 },
    rarity: 'common',
  },
  'streak_7': {
    id: 'streak_7',
    name: '持之以恒',
    description: '连续学习 7 天',
    icon: '🔥',
    category: 'streak',
    condition: { type: 'streak', value: 7 },
    rarity: 'uncommon',
  },
  'streak_14': {
    id: 'streak_14',
    name: '坚持不懈',
    description: '连续学习 14 天',
    icon: '💪',
    category: 'streak',
    condition: { type: 'streak', value: 14 },
    rarity: 'rare',
  },
  'streak_30': {
    id: 'streak_30',
    name: '毅力王者',
    description: '连续学习 30 天',
    icon: '👑',
    category: 'streak',
    condition: { type: 'streak', value: 30 },
    rarity: 'epic',
  },
  'streak_100': {
    id: 'streak_100',
    name: '传奇学霸',
    description: '连续学习 100 天',
    icon: '🏆',
    category: 'streak',
    condition: { type: 'streak', value: 100 },
    rarity: 'legendary',
  },
  
  // 学习天数类
  'days_7': {
    id: 'days_7',
    name: '一周挑战',
    description: '累计学习 7 天',
    icon: '📅',
    category: 'days',
    condition: { type: 'days', value: 7 },
    rarity: 'common',
  },
  'days_30': {
    id: 'days_30',
    name: '月度达人',
    description: '累计学习 30 天',
    icon: '🗓️',
    category: 'days',
    condition: { type: 'days', value: 30 },
    rarity: 'uncommon',
  },
  'days_100': {
    id: 'days_100',
    name: '百日筑基',
    description: '累计学习 100 天',
    icon: '🏯',
    category: 'days',
    condition: { type: 'days', value: 100 },
    rarity: 'rare',
  },
  'days_365': {
    id: 'days_365',
    name: '周年庆典',
    description: '累计学习 365 天',
    icon: '🎉',
    category: 'days',
    condition: { type: 'days', value: 365 },
    rarity: 'legendary',
  },
  
  // 单词数量类
  'words_100': {
    id: 'words_100',
    name: '百词斩',
    description: '累计学习 100 个单词',
    icon: '📚',
    category: 'words',
    condition: { type: 'words', value: 100 },
    rarity: 'common',
  },
  'words_500': {
    id: 'words_500',
    name: '五百词汇',
    description: '累计学习 500 个单词',
    icon: '📖',
    category: 'words',
    condition: { type: 'words', value: 500 },
    rarity: 'uncommon',
  },
  'words_1000': {
    id: 'words_1000',
    name: '千词达人',
    description: '累计学习 1000 个单词',
    icon: '📕',
    category: 'words',
    condition: { type: 'words', value: 1000 },
    rarity: 'rare',
  },
  'words_3000': {
    id: 'words_3000',
    name: '词汇大师',
    description: '累计学习 3000 个单词',
    icon: '🎓',
    category: 'words',
    condition: { type: 'words', value: 3000 },
    rarity: 'epic',
  },
  'words_5000': {
    id: 'words_5000',
    name: '词海无涯',
    description: '累计学习 5000 个单词',
    icon: '🌊',
    category: 'words',
    condition: { type: 'words', value: 5000 },
    rarity: 'legendary',
  },
  
  // 掌握单词类
  'mastered_50': {
    id: 'mastered_50',
    name: '小试牛刀',
    description: '掌握 50 个单词',
    icon: '✅',
    category: 'mastered',
    condition: { type: 'mastered', value: 50 },
    rarity: 'common',
  },
  'mastered_200': {
    id: 'mastered_200',
    name: '游刃有余',
    description: '掌握 200 个单词',
    icon: '⭐',
    category: 'mastered',
    condition: { type: 'mastered', value: 200 },
    rarity: 'uncommon',
  },
  'mastered_500': {
    id: 'mastered_500',
    name: '胸有成竹',
    description: '掌握 500 个单词',
    icon: '🌟',
    category: 'mastered',
    condition: { type: 'mastered', value: 500 },
    rarity: 'rare',
  },
  'mastered_1000': {
    id: 'mastered_1000',
    name: '出神入化',
    description: '掌握 1000 个单词',
    icon: '✨',
    category: 'mastered',
    condition: { type: 'mastered', value: 1000 },
    rarity: 'epic',
  },
  
  // 学习时长类
  'time_1h': {
    id: 'time_1h',
    name: '初露锋芒',
    description: '累计学习 1 小时',
    icon: '⏱️',
    category: 'time',
    condition: { type: 'time', value: 3600 },
    rarity: 'common',
  },
  'time_10h': {
    id: 'time_10h',
    name: '勤学苦练',
    description: '累计学习 10 小时',
    icon: '⏰',
    category: 'time',
    condition: { type: 'time', value: 36000 },
    rarity: 'uncommon',
  },
  'time_50h': {
    id: 'time_50h',
    name: '废寝忘食',
    description: '累计学习 50 小时',
    icon: '🕐',
    category: 'time',
    condition: { type: 'time', value: 180000 },
    rarity: 'rare',
  },
  'time_100h': {
    id: 'time_100h',
    name: '时间的王者',
    description: '累计学习 100 小时',
    icon: '⌛',
    category: 'time',
    condition: { type: 'time', value: 360000 },
    rarity: 'epic',
  },
  
  // 特殊成就
  'first_blood': {
    id: 'first_blood',
    name: '第一次',
    description: '完成第一次学习',
    icon: '🎯',
    category: 'special',
    condition: { type: 'first_session' },
    rarity: 'common',
  },
  'early_bird': {
    id: 'early_bird',
    name: '早起鸟儿',
    description: '早上 6 点前学习',
    icon: '🌅',
    category: 'special',
    condition: { type: 'early_session' },
    rarity: 'uncommon',
  },
  'night_owl': {
    id: 'night_owl',
    name: '夜猫子',
    description: '凌晨 1 点后学习',
    icon: '🌙',
    category: 'special',
    condition: { type: 'late_session' },
    rarity: 'uncommon',
  },
  'perfect_week': {
    id: 'perfect_week',
    name: '完美一周',
    description: '连续 7 天每天学习超过 30 分钟',
    icon: '💎',
    category: 'special',
    condition: { type: 'perfect_week' },
    rarity: 'epic',
  },
};

// 稀有度颜色
export const RARITY_COLORS = {
  common: { bg: '#6b7280', border: '#4b5563' },
  uncommon: { bg: '#16a34a', border: '#15803d' },
  rare: { bg: '#2563eb', border: '#1d4ed8' },
  epic: { bg: '#9333ea', border: '#7e22ce' },
  legendary: { bg: '#ca8a04', border: '#a16207' },
};

/**
 * 检查成就解锁
 */
export function checkAchievements(statistics, sessionData = null) {
  const unlocked = [];
  const storageKey = 'ielts_vocab_achievements';
  
  // 加载已解锁成就
  let unlockedIds = [];
  try {
    const stored = wx.getStorageSync(storageKey);
    if (stored) {
      unlockedIds = JSON.parse(stored);
    }
  } catch (error) {
    console.error('加载成就失败:', error);
  }
  
  // 遍历所有成就
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    // 已解锁的跳过
    if (unlockedIds.includes(achievement.id)) {
      return;
    }
    
    // 检查条件
    if (checkCondition(achievement, statistics, sessionData)) {
      unlockedIds.push(achievement.id);
      unlocked.push(achievement);
    }
  });
  
  // 保存已解锁成就
  if (unlocked.length > 0) {
    try {
      wx.setStorageSync(storageKey, JSON.stringify(unlockedIds));
    } catch (error) {
      console.error('保存成就失败:', error);
    }
  }
  
  return unlocked;
}

/**
 * 检查单个成就条件
 */
function checkCondition(achievement, statistics, sessionData) {
  const { condition } = achievement;
  
  switch (condition.type) {
    case 'streak':
      return statistics.currentStreak >= condition.value;
    
    case 'days':
      return statistics.totalLearningDays >= condition.value;
    
    case 'words':
      return statistics.totalWordsLearned >= condition.value;
    
    case 'mastered':
      return statistics.totalWordsMastered >= condition.value;
    
    case 'time':
      return statistics.totalLearningTime >= condition.value;
    
    case 'first_session':
      return statistics.totalLearningDays === 1;
    
    case 'early_session':
      if (!sessionData) return false;
      const sessionHour = new Date(sessionData.startTime).getHours();
      return sessionHour >= 0 && sessionHour < 6;
    
    case 'late_session':
      if (!sessionData) return false;
      const lateHour = new Date(sessionData.startTime).getHours();
      return lateHour >= 1 && lateHour < 6;
    
    case 'perfect_week':
      // 简化版本：检查当前连续天数是否>=7 且总学习时长>3.5 小时
      return statistics.currentStreak >= 7 && statistics.totalLearningTime >= 12600;
    
    default:
      return false;
  }
}

/**
 * 获取已解锁成就
 */
export function getUnlockedAchievements() {
  const storageKey = 'ielts_vocab_achievements';
  const unlockedIds = [];
  
  try {
    const stored = wx.getStorageSync(storageKey);
    if (stored) {
      const ids = JSON.parse(stored);
      return ids.map(id => ACHIEVEMENTS[id]).filter(a => a);
    }
  } catch (error) {
    console.error('加载成就失败:', error);
  }
  
  return [];
}

/**
 * 获取成就进度
 */
export function getAchievementProgress() {
  const unlockedIds = getUnlockedAchievements().map(a => a.id);
  
  const categories = ['streak', 'days', 'words', 'mastered', 'time', 'special'];
  const progress = {};
  
  categories.forEach(category => {
    const achievements = Object.values(ACHIEVEMENTS).filter(a => a.category === category);
    const unlocked = achievements.filter(a => unlockedIds.includes(a.id)).length;
    
    progress[category] = {
      unlocked,
      total: achievements.length,
      percentage: achievements.length > 0 
        ? Math.round((unlocked / achievements.length) * 100) 
        : 0,
    };
  });
  
  return {
    categories: progress,
    total: {
      unlocked: unlockedIds.length,
      total: Object.keys(ACHIEVEMENTS).length,
      percentage: Math.round(
        (unlockedIds.length / Object.keys(ACHIEVEMENTS).length) * 100
      ),
    },
  };
}

/**
 * 重置成就 (用于测试)
 */
export function resetAchievements() {
  wx.removeStorageSync('ielts_vocab_achievements');
}

export default {
  ACHIEVEMENTS,
  RARITY_COLORS,
  checkAchievements,
  getUnlockedAchievements,
  getAchievementProgress,
  resetAchievements,
};

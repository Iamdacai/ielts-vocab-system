/**
 * 学习进度管理器 - 微信小程序版
 * 使用 wx.setStorageSync 持久化学习数据
 */

const STORAGE_KEY = 'ielts_vocab_progress';
const STORAGE_VERSION = '1.0';

/**
 * 初始化进度数据
 */
function createProgressData() {
  return {
    version: STORAGE_VERSION,
    userId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // 学习进度
    vocabularyProgress: {},
    
    // 学习历史
    learningHistory: [],
    
    // 统计数据
    statistics: {
      totalLearningDays: 0,
      totalWordsLearned: 0,
      totalWordsMastered: 0,
      totalLearningTime: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastLearningDate: null,
    },
  };
}

/**
 * 加载进度数据
 */
export function loadProgress() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('加载进度失败:', error);
  }
  
  const data = createProgressData();
  saveProgress(data);
  return data;
}

/**
 * 保存进度数据
 */
export function saveProgress(data) {
  try {
    data.updatedAt = new Date().toISOString();
    wx.setStorageSync(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存进度失败:', error);
  }
}

/**
 * 更新单词进度
 */
export function updateWordProgress(data, wordId, vocabularySet, updates) {
  if (!data.vocabularyProgress[vocabularySet]) {
    data.vocabularyProgress[vocabularySet] = {};
  }
  
  let progress = data.vocabularyProgress[vocabularySet][wordId];
  
  if (!progress) {
    progress = {
      wordId,
      vocabularySet,
      stage: 0,
      nextReviewDate: null,
      correctCount: 0,
      wrongCount: 0,
      lastReviewDate: null,
      isMastered: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.vocabularyProgress[vocabularySet][wordId] = progress;
  }
  
  // 应用更新
  Object.assign(progress, updates, {
    updatedAt: new Date().toISOString(),
  });
  
  // 检查是否掌握
  if (progress.stage >= 5) {
    progress.isMastered = true;
  }
  
  saveProgress(data);
  return progress;
}

/**
 * 记录学习会话
 */
export function startLearningSession(data, vocabularySet, mode) {
  const sessionId = `session_${Date.now()}`;
  const log = {
    sessionId,
    vocabularySet,
    mode,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    newWordsCount: 0,
    reviewedWordsCount: 0,
    masteredWordsCount: 0,
    confirmedDuration: false,
  };
  
  data.learningHistory.push(log);
  saveProgress(data);
  return sessionId;
}

/**
 * 完成学习会话
 */
export function completeLearningSession(data, sessionId, stats, confirmedDuration) {
  const log = data.learningHistory.find(l => l.sessionId === sessionId);
  if (!log) return;
  
  log.endTime = new Date().toISOString();
  log.duration = stats.duration || 0;
  log.newWordsCount = stats.newWords || 0;
  log.reviewedWordsCount = stats.reviewedWords || 0;
  log.masteredWordsCount = stats.masteredWords || 0;
  log.confirmedDuration = confirmedDuration;
  
  // 更新统计
  updateStatistics(data, stats, confirmedDuration);
  
  saveProgress(data);
}

/**
 * 更新统计数据
 */
export function updateStatistics(data, stats, confirmedDuration) {
  const today = new Date().toDateString();
  const lastDate = data.statistics.lastLearningDate 
    ? new Date(data.statistics.lastLearningDate).toDateString() 
    : null;
  
  // 如果是新的一天，增加学习天数
  if (today !== lastDate) {
    data.statistics.totalLearningDays++;
    
    // 更新连续学习天数
    if (lastDate) {
      const lastLearning = new Date(data.statistics.lastLearningDate);
      const todayDate = new Date();
      const diffDays = Math.floor((todayDate - lastLearning) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        data.statistics.currentStreak++;
      } else if (diffDays > 1) {
        data.statistics.currentStreak = 1;
      }
    } else {
      data.statistics.currentStreak = 1;
    }
    
    // 更新最长连续天数
    if (data.statistics.currentStreak > data.statistics.longestStreak) {
      data.statistics.longestStreak = data.statistics.currentStreak;
    }
    
    data.statistics.lastLearningDate = new Date().toISOString();
  }
  
  // 累计数据
  data.statistics.totalWordsLearned += stats.newWords || 0;
  data.statistics.totalWordsMastered += stats.masteredWords || 0;
  
  if (confirmedDuration) {
    data.statistics.totalLearningTime += stats.duration || 0;
  }
  
  saveProgress(data);
}

/**
 * 获取统计数据
 */
export function getStatistics(data) {
  return { ...data.statistics };
}

/**
 * 获取学习历史
 */
export function getLearningHistory(data, limit = 30) {
  return data.learningHistory
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, limit);
}

/**
 * 获取词库进度
 */
export function getVocabularyProgress(data, vocabularySet) {
  const vocabData = data.vocabularyProgress[vocabularySet] || {};
  const words = Object.values(vocabData);
  
  const total = words.length;
  const mastered = words.filter(w => w.isMastered).length;
  const learning = words.filter(w => w.stage > 0 && w.stage < 5).length;
  const newWords = words.filter(w => w.stage === 0).length;
  
  return {
    total,
    mastered,
    learning,
    newWords,
    masteryRate: total > 0 ? Math.round((mastered / total) * 100) : 0,
  };
}

/**
 * 重置进度
 */
export function resetProgress() {
  wx.removeStorageSync(STORAGE_KEY);
  return createProgressData();
}

export default {
  loadProgress,
  saveProgress,
  updateWordProgress,
  startLearningSession,
  completeLearningSession,
  updateStatistics,
  getStatistics,
  getLearningHistory,
  getVocabularyProgress,
  resetProgress,
};

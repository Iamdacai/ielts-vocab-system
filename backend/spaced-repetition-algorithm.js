/**
 * 艾宾浩斯遗忘曲线算法实现
 * 复习间隔：5分钟、30分钟、12小时、1天、2天、4天、7天、15天
 */

class SpacedRepetitionAlgorithm {
  constructor() {
    // 基础复习间隔（分钟）
    this.baseIntervals = [5, 30, 720, 1440, 2880, 5760, 10080, 21600];
  }

  /**
   * 计算下一次复习时间
   * @param {number} reviewCount - 当前复习次数 (0 = 新词)
   * @param {number} masteryScore - 掌握度评分 (0-100)
   * @param {Date} currentTime - 当前时间
   * @returns {Date} 下次复习时间
   */
  calculateNextReview(reviewCount, masteryScore, currentTime = new Date()) {
    if (reviewCount >= this.baseIntervals.length) {
      // 已经完成所有基础间隔，根据掌握度动态调整
      const baseInterval = this.baseIntervals[this.baseIntervals.length - 1];
      const adjustmentFactor = masteryScore / 100; // 掌握度越高，间隔越长
      const finalInterval = baseInterval * (1 + adjustmentFactor);
      return new Date(currentTime.getTime() + finalInterval * 60000);
    }

    const intervalMinutes = this.baseIntervals[reviewCount];
    return new Date(currentTime.getTime() + intervalMinutes * 60000);
  }

  /**
   * 根据用户回答更新掌握度
   * @param {number} currentMastery - 当前掌握度
   * @param {boolean} isCorrect - 回答是否正确
   * @param {number} confidence - 用户自信度 (1-5)
   * @returns {number} 更新后的掌握度
   */
  updateMasteryScore(currentMastery, isCorrect, confidence) {
    let change = 0;
    
    if (isCorrect) {
      // 回答正确，掌握度提升
      change = confidence * 5; // 自信度越高，提升越多
    } else {
      // 回答错误，掌握度下降
      change = -confidence * 8; // 错误惩罚更重
    }
    
    const newMastery = Math.max(0, Math.min(100, currentMastery + change));
    return Math.round(newMastery * 100) / 100; // 保留两位小数
  }

  /**
   * 获取今日需要复习的单词
   * @param {Date} today - 今天的日期
   * @param {string} reviewTime - 用户设置的复习时间 "HH:MM"
   * @returns {Object} 包含复习时间段的对象
   */
  getReviewWindow(today, reviewTime) {
    const [hours, minutes] = reviewTime.split(':').map(Number);
    const reviewDateTime = new Date(today);
    reviewDateTime.setHours(hours, minutes, 0, 0);
    
    // 复习窗口：复习时间前后2小时
    const windowStart = new Date(reviewDateTime.getTime() - 2 * 60 * 60 * 1000);
    const windowEnd = new Date(reviewDateTime.getTime() + 2 * 60 * 60 * 1000);
    
    return { start: windowStart, end: windowEnd };
  }
}

module.exports = SpacedRepetitionAlgorithm;
/**
 * 九宫格记忆算法 - 微信小程序版
 * 基于艾宾浩斯遗忘曲线的 8 阶段复习系统
 */

// 8 个复习阶段配置
export const REVIEW_STAGES = [
  { id: 0, label: '新学', days: 0, color: '#ef4444' },     // 红色
  { id: 1, label: '第 1 天', days: 1, color: '#f59e0b' },   // 黄色
  { id: 2, label: '第 2 天', days: 2, color: '#f59e0b' },   // 黄色
  { id: 3, label: '第 4 天', days: 4, color: '#f59e0b' },   // 黄色
  { id: 4, label: '第 7 天', days: 7, color: '#f59e0b' },   // 黄色
  { id: 5, label: '第 15 天', days: 15, color: '#22c55e' }, // 绿色
  { id: 6, label: '第 21 天', days: 21, color: '#22c55e' }, // 绿色
  { id: 7, label: '已掌握', days: 30, color: '#22c55e' },   // 绿色
];

/**
 * 计算下一个复习阶段
 */
export function calculateNextStage(currentStage, isCorrect) {
  if (currentStage >= 7) {
    return isCorrect ? 7 : 4; // 已掌握后答错回退到阶段 4
  }
  return isCorrect ? Math.min(currentStage + 1, 7) : 0;
}

/**
 * 计算下次复习日期
 */
export function calculateNextReviewDate(lastReviewDate, stage) {
  const date = new Date(lastReviewDate);
  date.setDate(date.getDate() + REVIEW_STAGES[stage].days);
  return date;
}

/**
 * 判断是否需要复习
 */
export function isDueForReview(nextReviewDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reviewDate = new Date(nextReviewDate);
  reviewDate.setHours(0, 0, 0, 0);
  return today >= reviewDate;
}

/**
 * 计算扇形路径 (SVG)
 */
export function calculateArcPath(index, total, radius = 100) {
  const startAngle = (index * 360) / total;
  const endAngle = ((index + 1) * 360) / total;
  
  const startRad = (startAngle - 90) * Math.PI / 180;
  const endRad = (endAngle - 90) * Math.PI / 180;
  
  const x1 = 100 + radius * Math.cos(startRad);
  const y1 = 100 + radius * Math.sin(startRad);
  const x2 = 100 + radius * Math.cos(endRad);
  const y2 = 100 + radius * Math.sin(endRad);
  
  const largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0;
  
  return `M 100 100 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/**
 * 获取扇区中心点坐标
 */
export function getSectorCenter(index, total, radius = 100, innerRadius = 40) {
  const angle = ((index * 360) / total + 360 / total / 2 - 90) * Math.PI / 180;
  const r = (radius + innerRadius) / 2;
  
  return {
    x: 100 + r * Math.cos(angle),
    y: 100 + r * Math.sin(angle),
  };
}

/**
 * 统计各阶段单词数量
 */
export function countWordsByStage(words) {
  const counts = REVIEW_STAGES.map(stage => ({
    ...stage,
    count: 0,
  }));
  
  words.forEach(word => {
    if (word.stage >= 0 && word.stage < 8) {
      counts[word.stage].count++;
    }
  });
  
  return counts;
}

/**
 * 获取待复习单词
 */
export function getDueWords(words) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return words.filter(word => {
    if (!word.nextReviewDate) return true;
    const reviewDate = new Date(word.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);
    return today >= reviewDate;
  });
}

/**
 * 计算掌握率
 */
export function calculateMasteryRate(words) {
  if (words.length === 0) return 0;
  const masteredCount = words.filter(word => word.stage >= 5).length;
  return Math.round((masteredCount / words.length) * 100);
}

export default {
  REVIEW_STAGES,
  calculateNextStage,
  calculateNextReviewDate,
  isDueForReview,
  calculateArcPath,
  getSectorCenter,
  countWordsByStage,
  getDueWords,
  calculateMasteryRate,
};

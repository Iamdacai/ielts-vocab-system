/**
 * 记忆保留率计算工具
 * 基于艾宾浩斯遗忘曲线改进算法
 */

/**
 * 计算记忆保留率
 * @param {Date|number|string} lastReviewAt - 上次复习时间
 * @param {number} masteryLevel - 掌握等级 1-5
 * @returns {number} 保留率 0-100
 */
function calculateRetentionRate(lastReviewAt, masteryLevel = 1) {
    if (!lastReviewAt) return 100;
    
    const lastReview = new Date(lastReviewAt);
    const now = new Date();
    const hoursElapsed = (now - lastReview) / (1000 * 60 * 60);
    
    // 衰减常数（可调参数，值越大遗忘越慢）
    const decayConstant = 2.5;
    
    // 艾宾浩斯遗忘曲线公式改进版
    // retention = 100 * e^(-time / (decay * mastery))
    const retention = 100 * Math.exp(-hoursElapsed / (decayConstant * masteryLevel));
    
    return Math.max(0, Math.min(100, retention));
}

/**
 * 获取记忆强度等级
 * @param {number} retentionRate - 保留率 0-100
 * @returns {object} {level, color, label, emoji}
 */
function getRetentionLevel(retentionRate) {
    if (retentionRate < 20) {
        return { 
            level: 1, 
            color: '#ef4444', 
            label: '急需复习',
            emoji: '🔴',
            bgColor: '#fef2f2'
        };
    }
    if (retentionRate < 40) {
        return { 
            level: 2, 
            color: '#f97316', 
            label: '尽快复习',
            emoji: '🟠',
            bgColor: '#fff7ed'
        };
    }
    if (retentionRate < 60) {
        return { 
            level: 3, 
            color: '#eab308', 
            label: '可以复习',
            emoji: '🟡',
            bgColor: '#fefce8'
        };
    }
    if (retentionRate < 80) {
        return { 
            level: 4, 
            color: '#22c55e', 
            label: '状态良好',
            emoji: '🟢',
            bgColor: '#f0fdf4'
        };
    }
    return { 
        level: 5, 
        color: '#3b82f6', 
        label: '牢固掌握',
        emoji: '🔵',
        bgColor: '#eff6ff'
    };
}

/**
 * 计算下次复习时间（基于保留率）
 * @param {Date} lastReviewAt - 上次复习时间
 * @param {number} masteryLevel - 掌握等级
 * @param {number} targetRetention - 目标保留率（默认 60%）
 * @returns {Date} 下次复习时间
 */
function calculateNextReviewTime(lastReviewAt, masteryLevel = 1, targetRetention = 60) {
    const decayConstant = 2.5;
    
    // 反推时间：t = -decay * mastery * ln(retention/100)
    const hoursUntilTarget = -decayConstant * masteryLevel * Math.log(targetRetention / 100);
    
    const lastReview = new Date(lastReviewAt);
    const nextReview = new Date(lastReview.getTime() + hoursUntilTarget * 60 * 60 * 1000);
    
    return nextReview;
}

/**
 * 获取复习优先级评分
 * @param {number} retentionRate - 保留率
 * @param {number} errorCount - 错误次数
 * @param {boolean} isHighFrequency - 是否高频错题
 * @returns {number} 优先级评分（越高越优先）
 */
function calculateReviewPriority(retentionRate, errorCount = 0, isHighFrequency = false) {
    // 基础分：保留率越低优先级越高
    let priority = (100 - retentionRate);
    
    // 错误次数加权
    priority += errorCount * 10;
    
    // 高频错题额外加权
    if (isHighFrequency) {
        priority *= 1.5;
    }
    
    return Math.round(priority);
}

/**
 * 格式化倒计时
 * @param {Date} targetDate - 目标时间
 * @returns {string} 格式化后的倒计时文本
 */
function formatCountdown(targetDate) {
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target - now;
    
    if (diff <= 0) {
        return '已到期';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}天后`;
    }
    
    if (hours > 0) {
        return `${hours}小时后`;
    }
    
    return `${minutes}分钟后`;
}

/**
 * 获取记忆曲线数据（用于图表）
 * @param {Date} lastReviewAt - 上次复习时间
 * @param {number} masteryLevel - 掌握等级
 * @param {number} days - 显示天数
 * @returns {array} 曲线数据点
 */
function getRetentionCurveData(lastReviewAt, masteryLevel = 1, days = 7) {
    const data = [];
    const decayConstant = 2.5;
    const lastReview = new Date(lastReviewAt);
    
    for (let day = 0; day <= days; day++) {
        const hoursElapsed = day * 24;
        const retention = 100 * Math.exp(-hoursElapsed / (decayConstant * masteryLevel));
        
        data.push({
            day,
            hours: hoursElapsed,
            retention: Math.round(retention * 100) / 100,
            label: day === 0 ? '今天' : `${day}天后`
        });
    }
    
    return data;
}

/**
 * 批量计算单词记忆状态
 * @param {array} words - 单词列表（需包含 last_review_at, mastery_level）
 * @returns {array} 增强后的单词列表
 */
function batchCalculateWordStatus(words) {
    return words.map(word => {
        const retentionRate = calculateRetentionRate(
            word.last_review_at || word.lastReviewAt || Date.now(),
            word.mastery_level || word.masteryLevel || 1
        );
        
        const retentionLevel = getRetentionLevel(retentionRate);
        const nextReview = calculateNextReviewTime(
            word.last_review_at || word.lastReviewAt || Date.now(),
            word.mastery_level || word.masteryLevel || 1
        );
        
        const priority = calculateReviewPriority(
            retentionRate,
            word.error_count || 0,
            word.is_high_frequency || false
        );
        
        return {
            ...word,
            retentionRate,
            retentionLevel,
            nextReview,
            countdown: formatCountdown(nextReview),
            priority
        };
    });
}

module.exports = {
    calculateRetentionRate,
    getRetentionLevel,
    calculateNextReviewTime,
    calculateReviewPriority,
    formatCountdown,
    getRetentionCurveData,
    batchCalculateWordStatus
};

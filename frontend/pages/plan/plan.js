// pages/plan/plan.js
const app = getApp();
const API_BASE = app.globalData.apiBase || 'https://caiyuyang.cn:3001/api';

Page({
  data: {
    plan: null,
    todayTasks: [],
    today: '',
    remainingDays: 0,
    completionRate: 0,
    completedCount: 0,
    showCreateModal: false,
    examDate: '',
    targetScoreIndex: 0,
    currentScoreIndex: 0,
    timeIndex: 1,
    scoreOptions: ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'],
    timeOptions: ['1 小时', '2 小时', '3 小时', '4 小时', '5 小时+'],
    weakSkills: [
      { name: '阅读', value: 'reading', selected: false },
      { name: '听力', value: 'listening', selected: false },
      { name: '写作', value: 'writing', selected: false },
      { name: '口语', value: 'speaking', selected: false }
    ]
  },

  onLoad() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({ today });
    this.loadPlan();
    this.loadTodayTasks();
  },

  onShow() {
    this.loadPlan();
    this.loadTodayTasks();
  },

  // 加载学习计划
  async loadPlan() {
    try {
      const userId = wx.getStorageSync('userId');
      const res = await wx.request({
        url: `${API_BASE}/plan/${userId}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success && res.data.data) {
        const plan = res.data.data;
        const remainingDays = this._calculateRemainingDays(plan.exam_date);
        const completionRate = this._calculateCompletionRate(plan);
        
        this.setData({
          plan,
          remainingDays,
          completionRate
        });
      }
    } catch (error) {
      console.error('加载计划失败:', error);
    }
  },

  // 加载今日任务
  async loadTodayTasks() {
    try {
      const userId = wx.getStorageSync('userId');
      const res = await wx.request({
        url: `${API_BASE}/plan/${userId}/today`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success && res.data.data) {
        const todayTasks = res.data.data.tasks || [];
        const completedCount = todayTasks.filter(t => t.status === 'completed').length;
        
        this.setData({
          todayTasks,
          completedCount
        });
      }
    } catch (error) {
      console.error('加载今日任务失败:', error);
    }
  },

  // 创建计划
  createPlan() {
    this.setData({ showCreateModal: true });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showCreateModal: false });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ examDate: e.detail.value });
  },

  // 目标分数选择
  onTargetScoreChange(e) {
    this.setData({ targetScoreIndex: parseInt(e.detail.value) });
  },

  // 当前水平选择
  onCurrentScoreChange(e) {
    this.setData({ currentScoreIndex: parseInt(e.detail.value) });
  },

  // 学习时长选择
  onTimeChange(e) {
    this.setData({ timeIndex: parseInt(e.detail.value) });
  },

  // 确认创建
  async confirmCreate() {
    const { examDate, targetScoreIndex, currentScoreIndex, timeIndex, weakSkills } = this.data;

    if (!examDate) {
      wx.showToast({ title: '请选择考试日期', icon: 'none' });
      return;
    }

    const selectedWeakSkills = weakSkills
      .filter(w => w.selected)
      .map(w => w.value);

    const timeMap = ['1.0', '2.0', '3.0', '4.0', '5.0'];
    const scores = this.data.scoreOptions;

    try {
      wx.showLoading({ title: '创建中...' });

      const userId = wx.getStorageSync('userId');
      const res = await wx.request({
        url: `${API_BASE}/plan/create`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`,
          'Content-Type': 'application/json'
        },
        data: {
          examDate,
          targetScore: parseFloat(scores[targetScoreIndex]),
          currentScore: currentScoreIndex >= 0 ? parseFloat(scores[currentScoreIndex]) : 5.5,
          dailyStudyHours: parseFloat(timeMap[timeIndex]),
          weakSkills: selectedWeakSkills
        }
      });

      wx.hideLoading();

      if (res.data.success) {
        wx.showToast({ title: '创建成功', icon: 'success' });
        this.closeModal();
        this.loadPlan();
        this.loadTodayTasks();
      } else {
        wx.showToast({ title: res.data.error || '创建失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('创建计划失败:', error);
      wx.showToast({ title: '创建失败', icon: 'none' });
    }
  },

  // 完成任务
  async completeTask(e) {
    const taskId = e.currentTarget.dataset.id;
    const task = this.data.todayTasks.find(t => t.id === taskId);
    
    if (!task || task.status === 'completed') return;

    try {
      const planId = this.data.plan.id;
      await wx.request({
        url: `${API_BASE}/plan/${planId}/task/complete`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`,
          'Content-Type': 'application/json'
        },
        data: {
          taskId,
          taskDate: this.data.today,
          taskType: task.task_type
        }
      });

      // 更新本地状态
      const todayTasks = this.data.todayTasks.map(t => 
        t.id === taskId ? { ...t, status: 'completed' } : t
      );
      const completedCount = todayTasks.filter(t => t.status === 'completed').length;

      this.setData({ todayTasks, completedCount });

      wx.showToast({ title: '任务已完成 🎉', icon: 'success' });
    } catch (error) {
      console.error('完成任务失败:', error);
      wx.showToast({ title: '完成失败', icon: 'none' });
    }
  },

  // 前往诊断测试
  goToDiagnostic() {
    wx.navigateTo({
      url: '/pages/plan/diagnostic'
    });
  },

  // 前往进度页面
  goToProgress() {
    wx.navigateTo({
      url: '/pages/plan/progress'
    });
  },

  // 调整计划
  adjustPlan() {
    wx.showToast({ title: '功能开发中...', icon: 'none' });
  },

  // 查看日历
  viewCalendar() {
    wx.showToast({ title: '功能开发中...', icon: 'none' });
  },

  // 任务类型文本
  taskTypeText(type) {
    const map = {
      'vocabulary': '📖 词汇',
      'reading': '📚 阅读',
      'listening': '🎧 听力',
      'writing': '✍️ 写作',
      'speaking': '🎤 口语',
      'review': '🔄 复习',
      'mock_test': '📝 模考'
    };
    return map[type] || type;
  },

  // 计算剩余天数
  _calculateRemainingDays(examDate) {
    const today = new Date();
    const exam = new Date(examDate);
    const diff = exam - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  // 计算完成率
  _calculateCompletionRate(plan) {
    // TODO: 从后端获取实际完成率
    return 35; // 示例数据
  }
});

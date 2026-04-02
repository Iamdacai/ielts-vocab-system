// pages/listening/listening.js
const app = getApp();
const API_BASE = app.globalData.apiBase || 'https://caiyuyang.cn:3001/api';

Page({
  data: {
    testList: [],
    loading: false,
    category: 'all',
    difficulty: 'all',
    practicedCount: 0,
    accuracyRate: 0
  },

  onLoad() {
    this.loadTests();
    this.loadUserStats();
  },

  onShow() {
    this.loadTests();
  },

  // 加载测试列表
  async loadTests() {
    this.setData({ loading: true });

    try {
      const { category, difficulty } = this.data;
      let url = `${API_BASE}/listening/tests?limit=20`;
      
      if (difficulty !== 'all') {
        if (difficulty === 'easy') url += '&difficulty=5,6';
        else if (difficulty === 'medium') url += '&difficulty=7';
        else if (difficulty === 'hard') url += '&difficulty=8,9';
      }

      const res = await wx.request({
        url,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success) {
        let tests = res.data.data || [];
        
        // 如果选择了 Section 分类，过滤数据
        if (category !== 'all' && category !== 'dictation') {
          const sectionNum = parseInt(category.replace('section', ''));
          tests = tests.filter(t => t.section_number === sectionNum);
        }
        
        // 如果选择了听写，过滤数据
        if (category === 'dictation') {
          tests = tests.filter(t => t.title.includes('Dictation'));
        }

        this.setData({ testList: tests });
      }
    } catch (error) {
      console.error('加载听力测试失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const res = await wx.request({
        url: `${API_BASE}/listening/skill-analysis`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success && res.data.data) {
        this.setData({
          practicedCount: res.data.data.total_tests || 0,
          accuracyRate: res.data.data.accuracy_rate || 0
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.value;
    this.setData({ category });
    this.loadTests();
  },

  // 选择难度
  selectDifficulty(e) {
    const difficulty = e.currentTarget.dataset.value;
    this.setData({ difficulty });
    this.loadTests();
  },

  // 打开测试详情
  openTest(e) {
    const testId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/listening/detail?id=${testId}`
    });
  },

  // 智能推荐
  async getRecommendation() {
    wx.showLoading({ title: '生成推荐中...' });

    try {
      const res = await wx.request({
        url: `${API_BASE}/listening/recommend`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success && res.data.data.recommendations.length > 0) {
        const testId = res.data.data.recommendations[0].id;
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/listening/detail?id=${testId}`
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '暂无推荐',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取推荐失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '推荐失败',
        icon: 'none'
      });
    }
  },

  // 前往听写训练
  goToDictation() {
    this.setData({ category: 'dictation' });
    this.loadTests();
  },

  // 格式化时长
  formatDuration(seconds) {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
});

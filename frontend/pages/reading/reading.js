// pages/reading/reading.js
const app = getApp();
const API_BASE = app.globalData.apiBase || 'https://caiyuyang.cn:3001/api';

Page({
  data: {
    articleList: [],
    loading: false,
    difficulty: 'all',
    practicedCount: 0,
    accuracyRate: 0
  },

  onLoad() {
    this.loadArticles();
    this.loadUserStats();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadArticles();
  },

  // 加载文章列表
  async loadArticles() {
    this.setData({ loading: true });

    try {
      const { difficulty } = this.data;
      let url = `${API_BASE}/reading/articles?limit=20`;
      
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
        this.setData({
          articleList: res.data.data || []
        });
      }
    } catch (error) {
      console.error('加载文章列表失败:', error);
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
        url: `${API_BASE}/reading/skill-analysis`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success && res.data.data) {
        this.setData({
          practicedCount: res.data.data.total_questions || 0,
          accuracyRate: res.data.data.accuracy_rate || 0
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 选择难度
  selectDifficulty(e) {
    const difficulty = e.currentTarget.dataset.value;
    this.setData({ difficulty });
    this.loadArticles();
  },

  // 打开文章详情
  openArticle(e) {
    const articleId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/reading/detail?id=${articleId}`
    });
  },

  // 智能推荐
  async getRecommendation() {
    wx.showLoading({ title: '生成推荐中...' });

    try {
      const res = await wx.request({
        url: `${API_BASE}/reading/practice`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`,
          'Content-Type': 'application/json'
        },
        data: {}
      });

      if (res.data.success && res.data.data.recommendations.length > 0) {
        const articleId = res.data.data.recommendations[0].id;
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/reading/detail?id=${articleId}`
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
  }
});

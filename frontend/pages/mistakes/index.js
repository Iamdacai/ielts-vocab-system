// pages/mistakes/index.js
const app = getApp();
const { formatCountdown } = require('../../utils/memoryRetention');

Page({
  data: {
    mistakes: [],
    stats: {},
    highFrequencyMistakes: [],
    currentFilter: 'all',
    page: 1,
    limit: 20,
    hasMore: true,
    loading: false,
    errorTypeMap: {
      'spelling': '拼写错误',
      'recognition': '识别错误',
      'pronunciation': '发音错误',
      'usage': '用法错误',
      'listening': '听力错误'
    }
  },

  onLoad() {
    this.loadStats();
    this.loadMistakes();
    this.loadHighFrequency();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadStats();
    this.loadMistakes(true);
  },

  // 加载统计数据
  async loadStats() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/mistakes/stats`,
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        }
      });

      if (res.data.success) {
        this.setData({
          stats: {
            active_mistakes: res.data.data.overview.active_mistakes,
            high_frequency_count: res.data.data.overview.high_frequency_count,
            today_count: res.data.data.todayCount,
            eliminated_count: res.data.data.overview.eliminated_count
          }
        });
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  },

  // 加载高频错题
  async loadHighFrequency() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/mistakes/high-freq?limit=5`,
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        }
      });

      if (res.data.success) {
        this.setData({
          highFrequencyMistakes: res.data.data
        });
      }
    } catch (error) {
      console.error('加载高频错题失败:', error);
    }
  },

  // 加载错题列表
  async loadMistakes(refresh = false) {
    if (this.data.loading) return;

    if (refresh) {
      this.setData({ page: 1, mistakes: [], hasMore: true });
    }

    this.setData({ loading: true });

    try {
      const { page, limit, currentFilter } = this.data;
      let url = `${app.globalData.apiUrl}/mistakes/list?page=${page}&limit=${limit}&active_only=true`;

      if (currentFilter === 'high_frequency') {
        url += '&high_frequency_only=true';
      } else if (currentFilter !== 'all') {
        url += `&error_type=${currentFilter}`;
      }

      const res = await wx.request({
        url,
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        }
      });

      if (res.data.success) {
        const newMistakes = refresh ? res.data.data : [...this.data.mistakes, ...res.data.data];
        
        this.setData({
          mistakes: newMistakes,
          hasMore: newMistakes.length < res.data.pagination.total,
          loading: false
        });
      }
    } catch (error) {
      console.error('加载错题列表失败:', error);
      this.setData({ loading: false });
    }
  },

  // 切换筛选
  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });
    this.loadMistakes(true);
  },

  // 加载更多
  loadMore() {
    this.setData({ page: this.data.page + 1 });
    this.loadMistakes();
  },

  // 跳转到练习页面
  goToPractice(e) {
    const mistake = e.currentTarget.dataset.mistake;
    wx.navigateTo({
      url: `/pages/mistakes/practice?id=${mistake.id}&word_id=${mistake.word_id}`
    });
  },

  // 查看单词详情
  goToWord(e) {
    const item = e.currentTarget.dataset.word;
    wx.navigateTo({
      url: `/pages/word/detail?id=${item.word_id}`
    });
  },

  // 查看全部高频错题
  viewAllHighFreq() {
    this.setFilter({ currentTarget: { dataset: { filter: 'high_frequency' } } });
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
});

// pages/pronunciation/pronunciation.js
const app = getApp();

Page({
  data: {
    stats: {
      totalPractice: 0,
      averageScore: 0,
      bestScore: 0,
      uniqueWords: 0,
      bestWords: []
    },
    history: [],
    loading: true,
    offset: 0,
    limit: 20,
    hasMore: true
  },

  onLoad() {
    this.loadStats();
    this.loadHistory();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadStats();
    this.loadHistory();
  },

  /**
   * 加载统计数据
   */
  loadStats() {
    wx.request({
      url: `${app.globalData.apiUrl}/pronunciation/stats`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ stats: res.data });
        }
      },
      fail: (err) => {
        console.error('加载统计失败:', err);
      }
    });
  },

  /**
   * 加载历史记录
   */
  loadHistory() {
    const { offset, limit } = this.data;
    
    wx.request({
      url: `${app.globalData.apiUrl}/pronunciation/history?limit=${limit}&offset=${offset}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const newRecords = res.data.records || [];
          const hasMore = newRecords.length === limit;
          
          this.setData({
            history: offset === 0 ? newRecords : [...this.data.history, ...newRecords],
            offset: offset + limit,
            hasMore: hasMore,
            loading: false
          });
        }
      },
      fail: (err) => {
        console.error('加载历史失败:', err);
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 加载更多
   */
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ loading: true });
      this.loadHistory();
    } else {
      wx.showToast({
        title: '没有更多了',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到学习页面
   */
  goToLearning() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({
      offset: 0,
      history: [],
      loading: true,
      hasMore: true
    });
    this.loadStats();
    this.loadHistory();
    wx.stopPullDownRefresh();
  }
});

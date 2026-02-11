const app = getApp();

Page({
  data: {
    config: {
      weekly_new_words_days: [1, 2, 3, 4, 5, 6, 7],
      daily_new_words_count: 20,
      review_time: '20:00'
    },
    loading: true,
    daysOfWeek: [
      { value: 1, name: '周一' },
      { value: 2, name: '周二' },
      { value: 3, name: '周三' },
      { value: 4, name: '周四' },
      { value: 5, name: '周五' },
      { value: 6, name: '周六' },
      { value: 7, name: '周日' }
    ]
  },

  async onLoad() {
    await this.checkLoginStatus();
  },

  // 改进的登录状态检查
  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      // 验证token是否有效
      try {
        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: `${app.globalData.apiUrl}/health`,
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: resolve,
            fail: reject
          });
        });
        
        if (res.statusCode === 200) {
          // token有效
          app.globalData.token = token;
          app.globalData.userInfo = userInfo;
          app.globalData.hasLogin = true;
          this.loadConfig();
          return;
        }
      } catch (err) {
        console.log('Token验证失败:', err);
      }
    }
    
    // token无效或不存在，需要重新登录
    app.globalData.hasLogin = false;
    app.globalData.token = null;
    app.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    // 跳转到首页进行登录
    wx.redirectTo({
      url: '/pages/index/index'
    });
  },

  loadConfig() {
    wx.request({
      url: `${app.globalData.apiUrl}/config`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ 
            config: res.data,
            loading: false
          });
        } else {
          console.error('加载配置失败:', res);
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  toggleDay(e) {
    const dayValue = parseInt(e.currentTarget.dataset.day);
    const currentDays = [...this.data.config.weekly_new_words_days];
    const index = currentDays.indexOf(dayValue);
    
    if (index > -1) {
      // 移除选中的天
      currentDays.splice(index, 1);
    } else {
      // 添加未选中的天
      currentDays.push(dayValue);
      currentDays.sort((a, b) => a - b);
    }
    
    this.setData({
      'config.weekly_new_words_days': currentDays
    });
  },

  updateDailyCount(e) {
    const count = parseInt(e.detail.value) || 1;
    this.setData({
      'config.daily_new_words_count': Math.max(1, Math.min(100, count))
    });
  },

  updateReviewTime(e) {
    this.setData({
      'config.review_time': e.detail.value
    });
  },

  saveConfig() {
    wx.showLoading({
      title: '保存中...'
    });
    
    wx.request({
      url: `${app.globalData.apiUrl}/config`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`,
        'Content-Type': 'application/json'
      },
      data: this.data.config,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('保存配置失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  goBackHome() {
    wx.navigateBack({
      delta: 1
    });
  }
});
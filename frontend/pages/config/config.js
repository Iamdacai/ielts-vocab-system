const app = getApp();

Page({
  data: {
    config: {
      vocab_library: 'cambridge',  // 🆕 默认词库
      vocab_category: '',          // 🆕 词汇分类
      weekly_new_words_days: [1, 2, 3, 4, 5, 6, 7],
      daily_new_words_count: 20,
      review_time: '20:00'
    },
    loading: true,
    libraries: [],                 // 🆕 词库列表
    categories: [],                // 🆕 分类列表
    categoryIndex: 0,              // 🆕 当前选中的分类索引
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
    await this.loadLibraries();
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

  // 🆕 加载词库列表
  async loadLibraries() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/words/libraries`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        }
      });
      
      if (res.statusCode === 200) {
        this.setData({ 
          libraries: res.data,
          'config.vocab_library': res.data[0]?.id || 'cambridge'
        });
        
        // 加载默认词库的分类
        this.loadCategories();
      }
    } catch (err) {
      console.error('加载词库列表失败:', err);
    }
  },
  
  // 🆕 加载分类列表
  async loadCategories() {
    const library = this.data.config.vocab_library;
    
    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/words/categories?source=${library === 'zhenjing' ? '真经' : '剑桥'}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        }
      });
      
      if (res.statusCode === 200) {
        const categories = [{ id: '', name: '全部章节', word_count: 0 }, ...res.data];
        this.setData({ 
          categories,
          categoryIndex: 0
        });
      }
    } catch (err) {
      console.error('加载分类列表失败:', err);
    }
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
            config: {
              ...this.data.config,
              ...res.data
            },
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

  // 🆕 选择词库
  selectLibrary(e) {
    const libraryId = e.currentTarget.dataset.id;
    console.log('选择词库:', libraryId);
    this.setData({
      'config.vocab_library': libraryId,
      'config.vocab_category': ''  // 重置分类选择
    });
    
    // 重新加载分类列表
    this.loadCategories();
    
    wx.showToast({
      title: '已切换词库',
      icon: 'success',
      duration: 1500
    });
  },
  
  // 🆕 选择分类
  selectCategory(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    
    this.setData({
      categoryIndex: index,
      'config.vocab_category': category.id
    });
    
    wx.showToast({
      title: `已选择：${category.name}`,
      icon: 'success',
      duration: 1500
    });
  },
  
  toggleDay(e) {
    const dayValue = parseInt(e.currentTarget.dataset.value);
    console.log('切换天数:', dayValue);
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
    // 尝试返回，如果失败则跳转到首页
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果没有上一页，跳转到首页（tabBar 页面）
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  }
});
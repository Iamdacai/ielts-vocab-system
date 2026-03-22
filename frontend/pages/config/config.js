const app = getApp();

Page({
  data: {
    userInfo: null,
    config: {
      vocab_library: ['cambridge'],  // 🆕 默认词库（数组，支持多选）
      vocab_category: '',            // 🆕 词汇分类
      weekly_new_words_days: [1, 2, 3, 4, 5, 6, 7],
      daily_new_words_count: 20,
      review_time: '20:00'
    },
    loading: true,
    libraries: [],                   // 🆕 词库列表
    categories: [],                  // 🆕 分类列表
    categoryIndex: 0,                // 🆕 当前选中的分类索引
    daysOfWeek: [
      { value: 1, name: '周一', selected: true },
      { value: 2, name: '周二', selected: true },
      { value: 3, name: '周三', selected: true },
      { value: 4, name: '周四', selected: true },
      { value: 5, name: '周五', selected: true },
      { value: 6, name: '周六', selected: true },
      { value: 7, name: '周日', selected: true }
    ]
  },

  async onLoad() {
    this.loadUserInfo();
    await this.checkLoginStatus();
    await this.loadLibraries();
  },

  // 🆕 onShow 时重新检查登录状态（解决手动登录后页面未刷新问题）
  async onShow() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    // 如果之前未登录，现在已登录，重新加载配置
    if (token && userInfo) {
      // 更新全局状态（确保 app.globalData 同步）
      if (!app.globalData.hasLogin) {
        app.globalData.token = token;
        app.globalData.userInfo = userInfo;
        app.globalData.hasLogin = true;
      }
      
      // 如果之前没有用户信息，重新加载
      if (!this.data.userInfo) {
        this.loadUserInfo();
        await this.loadLibraries();
        this.loadConfig();
      }
    }
  },

  /**
   * 🆕 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo });
  },

  /**
   * 🆕 跳转到个人中心
   */
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
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
        const libraries = res.data;
        
        // 🆕 从后端获取用户已选的词库，如果没有则默认全选
        const selectedLibraries = this.data.config.vocab_library || libraries.map(lib => lib.id);
        
        // 🆕 为每个词库添加 selected 状态
        const librariesWithSelected = libraries.map(lib => ({
          ...lib,
          selected: selectedLibraries.includes(lib.id)
        }));
        
        this.setData({ 
          libraries: librariesWithSelected,
          'config.vocab_library': selectedLibraries
        });
        
        // 加载分类（如果有选中的词库）
        if (selectedLibraries.length > 0) {
          this.loadCategories();
        }
      }
    } catch (err) {
      console.error('加载词库列表失败:', err);
    }
  },
  
  // 🆕 加载分类列表
  async loadCategories() {
    // 🆕 获取第一个选中的词库（用于加载分类）
    const firstLibrary = this.data.config.vocab_library[0] || 'cambridge';
    
    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/words/categories?source=${firstLibrary === 'zhenjing' ? '真经' : '剑桥'}`,
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
          const serverConfig = res.data || {};
          const selectedDays = serverConfig.weekly_new_words_days || this.data.config.weekly_new_words_days;
          
          // 🆕 更新 daysOfWeek 的 selected 状态
          const updatedDays = this.data.daysOfWeek.map(day => ({
            ...day,
            selected: selectedDays.includes(day.value)
          }));
          
          this.setData({ 
            config: {
              ...this.data.config,
              ...serverConfig,
              weekly_new_words_days: selectedDays.map(day => parseInt(day))
            },
            daysOfWeek: updatedDays,
            loading: false
          }, () => {
            console.log('配置加载完成，当前选中天数:', this.data.config.weekly_new_words_days);
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

  // 🆕 切换词库选择（支持多选）
  toggleLibrary(e) {
    const libraryId = e.currentTarget.dataset.id;
    const selectedLibraries = this.data.config.vocab_library || [];
    
    // 切换选中状态
    const index = selectedLibraries.indexOf(libraryId);
    let newSelected;
    
    if (index > -1) {
      // 已选中，取消选中
      newSelected = selectedLibraries.filter(id => id !== libraryId);
    } else {
      // 未选中，添加
      newSelected = [...selectedLibraries, libraryId];
    }
    
    // 🆕 至少保留一个词库
    if (newSelected.length === 0) {
      wx.showToast({
        title: '至少选择一个词库',
        icon: 'none'
      });
      return;
    }
    
    // 更新 libraries 数组的 selected 状态
    const updatedLibraries = this.data.libraries.map(lib => ({
      ...lib,
      selected: newSelected.includes(lib.id)
    }));
    
    this.setData({
      libraries: updatedLibraries,
      'config.vocab_library': newSelected,
      'config.vocab_category': ''  // 重置分类选择
    });
    
    console.log('已选词库:', newSelected);
    
    // 重新加载分类列表
    this.loadCategories();
    
    wx.showToast({
      title: `已选择 ${newSelected.length} 个词库`,
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
    
    // 🆕 切换 selected 状态
    const updatedDays = this.data.daysOfWeek.map(day => {
      if (day.value === dayValue) {
        return { ...day, selected: !day.selected };
      }
      return day;
    });
    
    // 同时更新 config.weekly_new_words_days 数组
    const selectedDays = updatedDays.filter(day => day.selected).map(day => day.value);
    
    console.log('更新后的选中天数:', selectedDays);
    
    this.setData({
      daysOfWeek: updatedDays,
      'config.weekly_new_words_days': selectedDays
    }, () => {
      console.log('视图已更新');
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
    
    // 🆕 构建正确的配置数据格式
    const configData = {
      vocab_library: this.data.config.vocab_library,  // 🆕 词库数组
      vocab_category: this.data.config.vocab_category,
      weekly_new_words_days: this.data.config.weekly_new_words_days,
      daily_new_words_count: parseInt(this.data.config.daily_new_words_count) || 20,
      review_time: this.data.config.review_time || '20:00'
    };
    
    console.log('保存配置:', configData);
    
    wx.request({
      url: `${app.globalData.apiUrl}/config`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`,
        'Content-Type': 'application/json'
      },
      data: configData,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          // 🆕 保存成功后更新全局配置
          wx.setStorageSync('userConfig', configData);
        } else {
          console.error('保存配置失败:', res);
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
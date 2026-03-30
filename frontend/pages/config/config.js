const app = getApp();

Page({
  data: {
    userInfo: null,
    config: {
      vocab_library: [],             // 🆕 默认词库（空数组，加载时从服务器获取）
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
  },
  
  // 🆕 onShow 时加载词库和配置（确保登录状态已准备好）
  async onShow() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    // 确保全局状态已设置
    if (token && userInfo && !app.globalData.hasLogin) {
      app.globalData.token = token;
      app.globalData.userInfo = userInfo;
      app.globalData.hasLogin = true;
    }
    
    // 如果已登录，加载词库和配置
    if (app.globalData.hasLogin && app.globalData.token) {
      // 每次都重新加载词库和配置（确保数据最新）
      await this.loadLibraries();
      this.loadConfig();
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

  /**
   * 🆕 跳转到 AI 兴趣设置页
   */
  goToAIInterests() {
    wx.navigateTo({
      url: '/pages/ai-interests/ai-interests'
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
      console.log('[词库] 开始加载词库列表...');
      console.log('[词库] API 地址:', app.globalData.apiUrl);
      console.log('[词库] Token:', app.globalData.token ? '存在' : '不存在');
      
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.apiUrl}/words/libraries`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${app.globalData.token}`
          },
          success: resolve,
          fail: reject
        });
      });
      
      console.log('[词库] 响应状态码:', res.statusCode);
      console.log('[词库] 响应数据:', res.data);
      
      if (res.statusCode === 200) {
        const libraries = res.data;
        
        if (!libraries || libraries.length === 0) {
          console.warn('[词库] 词库列表为空');
          wx.showToast({
            title: '词库列表为空',
            icon: 'none'
          });
          return;
        }
        
        // 🆕 获取新词库 ID 列表
        const newLibraryIds = libraries.map(lib => lib.id);
        console.log('[词库] 新词库 ID 列表:', newLibraryIds);
        
        // 🆕 从后端服务器加载用户配置（而不是本地缓存）
        const userConfig = wx.getStorageSync('userConfig') || {};
        let savedLibraries = userConfig.vocab_library || [];
        console.log('[词库] 本地缓存的词库:', savedLibraries);
        
        // 🆕 清理 cambridge 等无效词库
        const INVALID_LIBRARIES = ['cambridge', 'zhenjing'];
        savedLibraries = savedLibraries.filter(id => !INVALID_LIBRARIES.includes(id));
        console.log('[词库] 清理无效词库后:', savedLibraries);
        
        // 🆕 过滤掉不在新列表中的旧词库
        const validLibraries = savedLibraries.filter(id => newLibraryIds.includes(id));
        console.log('[词库] 有效的词库:', validLibraries);
        
        // 🆕 如果没有有效的词库（都是旧词库或空），则默认全选新词库
        let selectedLibraries;
        if (validLibraries.length === 0) {
          if (savedLibraries.length > 0) {
            console.log('[词库] 检测到旧词库缓存，清空并全选新词库');
            wx.showToast({
              title: '词库已更新，已为您全选新词库',
              icon: 'none',
              duration: 2500
            });
          } else {
            console.log('[词库] 首次选择词库，默认全选');
          }
          selectedLibraries = newLibraryIds;
          
          // 🆕 更新本地缓存
          userConfig.vocab_library = newLibraryIds;
          wx.setStorageSync('userConfig', userConfig);
        } else {
          // 有有效的词库，使用有效的词库
          selectedLibraries = validLibraries;
        }
        
        // 🆕 为每个词库添加 selected 状态
        const librariesWithSelected = libraries.map(lib => ({
          ...lib,
          selected: selectedLibraries.includes(lib.id)
        }));
        
        this.setData({ 
          libraries: librariesWithSelected,
          'config.vocab_library': selectedLibraries
        });
        
        console.log('[词库] 加载成功，词库数量:', librariesWithSelected.length);
        console.log('[词库] 已选词库:', selectedLibraries);
        
        // 🆕 检测是否需要提示用户更新词库（词库升级通知）
        this.checkLibraryUpdate();
        
        // 加载分类（如果有选中的词库）
        if (selectedLibraries.length > 0) {
          this.loadCategories();
        }
      } else {
        console.error('[词库] 加载失败，状态码:', res.statusCode);
        wx.showToast({
          title: '加载失败：' + res.statusCode,
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('[词库] 加载异常:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  },
  
  // 🆕 检测词库更新并提示用户
  checkLibraryUpdate() {
    // 旧词库列表（需要用户重新选择的词库）
    const OLD_LIBRARIES = [
      '托福 9000 词 Word',
      '词汇总编 9800 带音标 + 词汇 9400',
      '词汇汇编 9800',
      '托福词汇 4700+ 词汇 9400',
      'GRE 词汇 7500+ 词汇 9400',
      '3500 词汇高中词汇表',
      '雅思词汇 4500+ 词汇 9400',
      '初中英语单词表大全 2182 个单词中考英语 1600 词汇对照表分类记忆法 (1)',
      '身心健康',
      '学校教育',
      '05.大学英语四级词汇带默写版',
      '小学英语常用单词汇总大全',
      '行为动作',
      '自然地理',
      '沙场争锋',
      '娱乐运动',
      '饮食健康',
      '社会经济',
      '动物保护',
      '物品材料',
      '国家政府',
      '交通旅行',
      '建筑场所',
      '植物研究',
      '科技发明',
      '社会角色',
      '法律法规',
      '时尚潮流',
      '文化历史',
      '太空探索',
      '语言演化',
      '时间日期'
    ];
    
    // 检查用户当前选择的词库是否包含旧词库
    const savedLibraries = wx.getStorageSync('userConfig')?.vocab_library || [];
    const hasOldLibrary = savedLibraries.some(lib => OLD_LIBRARIES.includes(lib));
    
    // 检查是否已经显示过提示（避免重复打扰）
    const hasNotified = wx.getStorageSync('library_update_notified');
    
    if (hasOldLibrary && !hasNotified) {
      wx.showModal({
        title: '🎉 词库已更新',
        content: '词库列表已升级，请重新选择你想学习的词库（支持多选）',
        confirmText: '去选择',
        showCancel: false,
        success: () => {
          // 标记已通知
          wx.setStorageSync('library_update_notified', true);
          // 自动滚动到词库选择区域
          wx.createSelectorQuery().select('.library-selector')
            .boundingClientRect(rect => {
              if (rect) {
                wx.pageScrollTo({ 
                  scrollTop: rect.top - 20,
                  duration: 300
                });
              }
            }).exec();
        }
      });
    }
  },
  
  // 🆕 加载分类列表
  async loadCategories() {
    // 🆕 获取第一个选中的词库（用于加载分类）
    const firstLibrary = this.data.config.vocab_library[0] || (this.data.libraries[0] ? this.data.libraries[0].id : '');
    
    // 🆕 判断是否是真经词库（包含"真经"关键字）
    const isZhenjing = firstLibrary && firstLibrary.includes('真经');
    
    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/words/categories?source=${isZhenjing ? '真经' : ''}`,
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
          const selectedLibraries = serverConfig.vocab_library || [];
          
          console.log('[配置] 服务器返回的词库:', selectedLibraries);
          
          // 🆕 更新 daysOfWeek 的 selected 状态
          const updatedDays = this.data.daysOfWeek.map(day => ({
            ...day,
            selected: selectedDays.includes(day.value)
          }));
          
          // 🆕 更新 libraries 的 selected 状态（与服务器同步）
          const updatedLibraries = this.data.libraries.map(lib => ({
            ...lib,
            selected: selectedLibraries && selectedLibraries.includes(lib.id)
          }));
          
          this.setData({ 
            config: {
              ...this.data.config,
              ...serverConfig,
              weekly_new_words_days: selectedDays.map(day => parseInt(day)),
              vocab_library: selectedLibraries || []  // 🆕 使用服务器返回的词库
            },
            daysOfWeek: updatedDays,
            libraries: updatedLibraries,  // 🆕 同步更新词库列表的选中状态
            loading: false
          }, () => {
            console.log('[配置] 加载完成');
            console.log('[配置] 已选词库:', this.data.config.vocab_library);
            console.log('[配置] 已选天数:', this.data.config.weekly_new_words_days);
            console.log('[配置] 词库选中状态:', this.data.libraries.filter(l => l.selected).length);
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
          // 🆕 保存成功后更新全局配置
          wx.setStorageSync('userConfig', configData);
          
          wx.showModal({
            title: '保存成功',
            content: '词库配置已保存，返回首页查看更新的统计数据',
            showCancel: false,
            success: () => {
              // 🆕 跳转到首页，让首页重新加载统计数据
              wx.switchTab({
                url: '/pages/index/index'
              });
            }
          });
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
  },

  /**
   * 🆕 检查录音权限
   */
  checkRecordPermission() {
    wx.getSetting({
      success: (res) => {
        console.log('[权限检查] 当前设置:', res.authSetting);
        
        if (res.authSetting['scope.record'] === true) {
          wx.showModal({
            title: '权限已开启',
            content: '录音权限已开启，可以在跟读练习中使用录音功能',
            showCancel: false
          });
        } else if (res.authSetting['scope.record'] === false) {
          wx.showModal({
            title: '权限未开启',
            content: '录音权限已被拒绝，请在设置中手动开启',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.record'] === true) {
                      wx.showModal({
                        title: '权限已开启',
                        content: '录音权限已开启，现在可以使用跟读练习功能',
                        showCancel: false
                      });
                    }
                  }
                });
              }
            }
          });
        } else {
          // 从未申请过，提示用户去使用功能触发申请
          wx.showModal({
            title: '权限未申请',
            content: '您还未使用过录音功能\n\n请进入复习页面，点击"跟读练习"按钮，微信会弹出授权对话框',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      },
      fail: (err) => {
        console.error('[权限检查] 失败:', err);
        wx.showToast({
          title: '权限检查失败',
          icon: 'error'
        });
      }
    });
  }
});
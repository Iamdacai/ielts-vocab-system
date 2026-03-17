// pages/index/index.js - 简化版
const app = getApp();

Page({
  data: {
    hasLogin: false,
    userInfo: null,
    stats: {
      total_words: 0,
      mastered_words: 0,
      learning_words: 0,
      avg_mastery_score: 0
    },
    todayStats: {
      newWords: 0,
      reviewWords: 0,
      masteredWords: 0
    },
    memoryWheelData: [],
    dueWordsCount: 0,
    masteryRate: 0,
    loading: true
  },

  onLoad() {
    // 🆕 自动登录已在 app.js 中处理，直接使用全局状态
    this.setData({
      hasLogin: app.globalData.hasLogin,
      userInfo: app.globalData.userInfo
    });
  },

  onShow() {
    // 🆕 始终显示 tabBar（自动登录）
    wx.showTabBar();
    
    // 等待 app 自动登录完成后加载数据
    if (app.globalData.hasLogin) {
      this.setData({
        hasLogin: true,
        userInfo: app.globalData.userInfo
      });
      this.loadStats();
    } else {
      // 如果还未登录，等待登录完成
      const checkLogin = setInterval(() => {
        if (app.globalData.hasLogin) {
          clearInterval(checkLogin);
          this.setData({
            hasLogin: true,
            userInfo: app.globalData.userInfo
          });
          this.loadStats();
        }
      }, 500);
      
      // 最多等待 10 秒
      setTimeout(() => clearInterval(checkLogin), 10000);
    }
  },

  /**
   * 🆕 跳转到个人中心
   */
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },
    this.setData({ 
      hasLogin: false,
      loading: false
    });
  },

  async loadStats() {
    try {
      // 加载统计数据
      const statsRes = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.apiUrl}/stats`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${app.globalData.token}`
          },
          success: resolve,
          fail: reject
        });
      });

      if (statsRes.statusCode === 200) {
        const stats = statsRes.data;
        
        // 🆕 从后端统计数据中获取今日学习数据
        const todayStats = {
          newWords: stats.today_new_words || 0,
          reviewWords: stats.today_review_words || 0,
          masteredWords: stats.mastered_words || 0
        };
        
        // 🆕 使用后端返回的待复习单词数
        const dueCount = stats.due_words_count || 0;
        
        // 🆕 计算掌握率
        const totalWords = stats.total_words || 0;
        const masteredWords = stats.mastered_words || 0;
        const masteryRate = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;
        
        this.setData({
          stats,
          todayStats,
          dueWordsCount: dueCount,
          masteryRate,
          loading: false
        });
      } else {
        this.setData({ loading: false });
        if (statsRes.statusCode === 403) {
          this.checkLoginStatus();
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      this.setData({ loading: false });
    }
  },

  handleLogin() {
    // 🆕 开发阶段：直接使用测试账号登录
    // 生产环境请改用 wx.login()
    const useTestAccount = true; // 设置为 false 使用微信登录
    
    if (useTestAccount) {
      this.testLogin();
      return;
    }
    
    // 正式微信登录
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          wx.request({
            url: `${app.globalData.apiUrl}/auth/login`,
            method: 'POST',
            data: { code: loginRes.code },
            success: (res) => {
              if (res.statusCode === 200 && res.data.token) {
                app.globalData.token = res.data.token;
                app.globalData.userInfo = res.data.user;
                app.globalData.hasLogin = true;
                
                wx.setStorageSync('token', res.data.token);
                wx.setStorageSync('userInfo', res.data.user);
                
                this.setData({
                  hasLogin: true,
                  userInfo: res.data.user
                });
                
                // 🆕 登录后显示 tabBar
                wx.showTabBar();
                
                this.loadStats();
              } else {
                wx.showToast({
                  title: '登录失败',
                  icon: 'error'
                });
              }
            },
            fail: (err) => {
              console.error('登录请求失败:', err);
              wx.showToast({
                title: '网络错误',
                icon: 'error'
              });
            }
          });
        } else {
          wx.showToast({
            title: '获取登录码失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('微信登录失败:', err);
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 🆕 测试账号登录（开发阶段使用）
   */
  async testLogin() {
    wx.showLoading({ title: '登录中...' });
    
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.apiUrl}/auth/login`,
          method: 'POST',
          data: { code: 'test_user' },
          success: resolve,
          fail: reject
        });
      });
      
      wx.hideLoading();
      
      if (res.statusCode === 200 && res.data.token) {
        app.globalData.token = res.data.token;
        app.globalData.userInfo = res.data.user;
        app.globalData.hasLogin = true;
        
        wx.setStorageSync('token', res.data.token);
        wx.setStorageSync('userInfo', res.data.user);
        
        this.setData({
          hasLogin: true,
          userInfo: res.data.user
        });
        
        // 🆕 登录后显示 tabBar
        wx.showTabBar();
        
        this.loadStats();
        
        wx.showToast({
          title: '测试登录成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('测试登录失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      });
    }
  },

  startReview() {
    // 直接跳转到复习页面（显示九宫格）
    wx.navigateTo({
      url: '/pages/review/review'
    });
  },

  navigateToLearning() {
    if (!this.data.hasLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/learning/learning' });
  },

  navigateToReview() {
    if (!this.data.hasLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (this.data.dueWordsCount > 0) {
      wx.navigateTo({ url: '/pages/review/review' });
    } else {
      wx.showToast({ title: '没有待复习的单词', icon: 'none' });
    }
  },

  navigateToConfig() {
    if (!this.data.hasLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/config/config' });
  }
});

// pages/index/index.js
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
    loading: true
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    if (this.data.hasLogin) {
      this.loadStats();
    }
  },

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
          this.setData({ 
            hasLogin: true,
            userInfo: userInfo
          });
          this.loadStats();
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
    this.setData({ 
      hasLogin: false,
      loading: false
    });
  },

  loadStats() {
    wx.request({
      url: `${app.globalData.apiUrl}/stats`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ 
            stats: res.data,
            loading: false
          });
        } else {
          console.error('加载统计失败:', res);
          this.setData({ loading: false });
          // 如果是403错误，重新触发登录检查
          if (res.statusCode === 403) {
            this.checkLoginStatus();
          }
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        this.setData({ loading: false });
      }
    });
  },

  handleLogin() {
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 调用后端登录接口
          wx.request({
            url: `${app.globalData.apiUrl}/auth/login`,
            method: 'POST',
            data: { code: loginRes.code },
            success: (res) => {
              if (res.statusCode === 200 && res.data.token) {
                // 保存登录信息
                app.globalData.token = res.data.token;
                app.globalData.userInfo = res.data.user;
                app.globalData.hasLogin = true;
                
                wx.setStorageSync('token', res.data.token);
                wx.setStorageSync('userInfo', res.data.user);
                
                this.setData({
                  hasLogin: true,
                  userInfo: res.data.user
                });
                
                // 加载统计数据
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

  navigateToLearning() {
    if (!this.data.hasLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/learning/learning'
    });
  },

  navigateToReview() {
    if (!this.data.hasLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/review/review'
    });
  },

  navigateToConfig() {
    if (!this.data.hasLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/config/config'
    });
  }
});
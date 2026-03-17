// pages/login/login.js
const app = getApp();

Page({
  data: {
    loginLoading: false
  },

  onLoad() {
    // 检查是否已登录
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      // 已登录，验证 token 是否有效
      this.checkTokenValidity(token);
    }
  },

  /**
   * 检查 token 有效性
   */
  checkTokenValidity(token) {
    wx.request({
      url: `${app.globalData.apiUrl}/auth/check`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.valid) {
          // token 有效，跳转到首页
          wx.switchTab({
            url: '/pages/index/index'
          });
        } else {
          // token 无效，清除本地存储
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
        }
      },
      fail: () => {
        // 请求失败，清除本地存储
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
      }
    });
  },

  /**
   * 微信登录
   */
  handleWechatLogin() {
    this.setData({ loginLoading: true });
    
    // 1. 获取微信登录 code
    wx.login({
      success: (res) => {
        if (res.code) {
          // 2. 调用后端登录接口
          this.doLogin(res.code);
        } else {
          this.setData({ loginLoading: false });
          wx.showToast({
            title: '登录失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        this.setData({ loginLoading: false });
        console.error('微信登录失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 执行登录
   */
  doLogin(code) {
    wx.request({
      url: `${app.globalData.apiUrl}/auth/wechat-login`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        code: code
      },
      success: (res) => {
        this.setData({ loginLoading: false });
        
        if (res.statusCode === 200 && res.data.token) {
          // 登录成功，保存 token 和用户信息
          const { token, user } = res.data;
          
          wx.setStorageSync('token', token);
          wx.setStorageSync('userInfo', user);
          
          // 更新全局状态
          app.setLoginStatus(token, user);
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
          
          // 延迟跳转到首页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }, 1000);
        } else {
          wx.showToast({
            title: res.data.message || '登录失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        this.setData({ loginLoading: false });
        console.error('登录请求失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  }
});

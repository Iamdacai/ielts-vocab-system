// app.js
App({
  onLaunch() {
    // 初始化全局状态
    this.globalData = {
      userInfo: null,
      hasLogin: false,
      apiUrl: 'http://localhost:3000/api', // 开发环境API地址
      token: null
    };
    
    // 尝试从本地存储恢复登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.hasLogin = true;
    }
  },
  
  globalData: {}
});
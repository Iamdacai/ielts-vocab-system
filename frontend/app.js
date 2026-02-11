// app.js
App({
  onLaunch() {
    // 正式部署 - 固定使用正式域名
    // 初始化全局状态
    this.globalData = {
      userInfo: null,
      hasLogin: false,
      // 正式部署使用HTTPS域名
      apiUrl: 'https://ielts.caiyuyang.cn/api',
      token: null
    };
    
    console.log('API地址:', this.globalData.apiUrl);
    
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
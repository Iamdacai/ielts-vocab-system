// app.js
App({
  onLaunch() {
    // ⚠️ 本地开发环境 - 强制使用本地后端
    const isLocal = true; // 本地开发时设为 true，部署时设为 false
    
    // 初始化全局状态
    this.globalData = {
      userInfo: null,
      hasLogin: false,
      // ⚠️ 本地开发使用 localhost:3001，正式部署使用 HTTPS 域名
      apiUrl: 'http://localhost:3001/api',  // 强制本地地址
      token: null
    };
    
    console.log('========================================');
    console.log('API 地址:', this.globalData.apiUrl);
    console.log('运行环境:', isLocal ? '本地开发' : '正式环境');
    console.log('========================================');
    
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

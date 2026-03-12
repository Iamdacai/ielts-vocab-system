// app.js
App({
  onLaunch() {
    // ⚠️ 生产环境 - 使用正式域名（小程序在 Windows 上运行）
    const serverDomain = 'caiyuyang.cn';  // 正式域名
    const serverPort = '3001';
    
    // 初始化全局状态
    this.globalData = {
      userInfo: null,
      hasLogin: false,
      // ⚠️ 使用 HTTPS 正式域名
      apiUrl: `https://${serverDomain}:${serverPort}/api`,
      token: null
    };
    
    console.log('========================================');
    console.log('API 地址:', this.globalData.apiUrl);
    console.log('服务器域名:', serverDomain);
    console.log('服务器端口:', serverPort);
    console.log('运行环境：生产环境（HTTPS 域名）');
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

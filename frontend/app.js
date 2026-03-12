// app.js
App({
  onLaunch() {
    // ⚠️ 本地开发环境 - 使用 HTTP 本地地址
    const serverDomain = 'caiyuyang.cn';  // 本地开发
    const serverPort = '3001';
    
    // 初始化全局状态
    this.globalData = {
      userInfo: null,
      hasLogin: false,
      // ⚠️ 使用 HTTP 本地地址进行开发测试
      apiUrl: `http://${serverDomain}:${serverPort}/api`,
      token: null
    };
    
    console.log('========================================');
    console.log('API 地址:', this.globalData.apiUrl);
    console.log('服务器域名:', serverDomain);
    console.log('服务器端口:', serverPort);
    console.log('运行环境：本地开发（HTTP 本地地址）');
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

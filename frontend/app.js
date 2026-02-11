// app.js
App({
  onLaunch() {
    // 根据环境自动选择API地址
    const isDev = wx.getAccountInfoSync().miniProgram.envVersion === 'develop';
    
    // 初始化全局状态
    this.globalData = {
      userInfo: null,
      hasLogin: false,
      // 生产环境使用正式域名，开发环境使用本地地址
      apiUrl: isDev ? 'http://localhost:3000/api' : 'https://ielts.caiyuyang.cn/api',
      token: null
    };
    
    console.log('当前环境:', wx.getAccountInfoSync().miniProgram.envVersion);
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
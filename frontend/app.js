// app.js
const auth = require('./utils/auth');

App({
  onLaunch() {
    // 服务器配置
    const serverDomain = 'caiyuyang.cn';
    const serverPort = '3001';
    
    // 初始化全局状态
    this.globalData = {
      userInfo: null,
      hasLogin: false,
      apiUrl: `https://${serverDomain}:${serverPort}/api`,
      token: null
    };
    
    console.log('========================================');
    console.log('API 地址:', this.globalData.apiUrl);
    console.log('服务器域名:', serverDomain);
    console.log('服务器端口:', serverPort);
    console.log('========================================');
    
    // 从本地存储恢复登录状态
    this.checkLoginStatus();
  },
  
  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const token = auth.getToken();
    const userInfo = auth.getUserInfo();
    
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.hasLogin = true;
    }
  },
  
  /**
   * 更新全局登录状态
   */
  setLoginStatus(token, userInfo) {
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    this.globalData.hasLogin = true;
  },
  
  /**
   * 清除登录状态
   */
  clearLoginStatus() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.hasLogin = false;
  },
  
  /**
   * 检查是否是管理员
   */
  isAdmin() {
    return this.globalData.userInfo?.user?.role === 'admin';
  }
});

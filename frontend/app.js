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
    
    // 🆕 自动登录：先检查本地 token，如果没有则自动微信登录
    this.autoLogin();
  },
  
  /**
   * 🆕 自动登录
   */
  async autoLogin() {
    const token = auth.getToken();
    const userInfo = auth.getUserInfo();
    
    if (token && userInfo) {
      // 有 token，验证是否有效
      try {
        const res = await this.checkToken(token);
        if (res.valid) {
          // token 有效，恢复登录状态
          this.globalData.token = token;
          this.globalData.userInfo = res.user;
          this.globalData.hasLogin = true;
          console.log('✅ 自动登录成功（token 有效）');
          return;
        }
      } catch (err) {
        console.log('Token 验证失败，重新登录:', err);
      }
    }
    
    // token 无效或不存在，执行微信登录
    console.log('🔄 执行微信自动登录...');
    this.wechatAutoLogin();
  },
  
  /**
   * 🆕 检查 token 有效性
   */
  checkToken(token) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.apiUrl}/auth/check`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.valid) {
            resolve(res.data);
          } else {
            reject(new Error('Token 无效'));
          }
        },
        fail: reject
      });
    });
  },
  
  /**
   * 🆕 微信自动登录
   */
  wechatAutoLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          this.doLogin(res.code);
        } else {
          console.error('微信登录失败:', res.errMsg);
        }
      },
      fail: (err) => {
        console.error('微信登录失败:', err);
      }
    });
  },
  
  /**
   * 🆕 执行登录
   */
  doLogin(code) {
    wx.request({
      url: `${this.globalData.apiUrl}/auth/wechat-login`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        code: code
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.token) {
          const { token, user } = res.data;
          
          // 保存 token 和用户信息
          wx.setStorageSync('token', token);
          wx.setStorageSync('userInfo', user);
          
          // 更新全局状态
          this.setLoginStatus(token, user);
          
          console.log('✅ 微信自动登录成功:', user.nickname);
          
          // 如果是管理员，记录 openid 到日志（首次登录时）
          if (user.role === 'admin') {
            console.log('👑 管理员登录:', user.openid);
          }
        } else {
          console.error('登录失败:', res.data);
        }
      },
      fail: (err) => {
        console.error('登录请求失败:', err);
      }
    });
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
    return this.globalData.userInfo?.role === 'admin';
  }
});

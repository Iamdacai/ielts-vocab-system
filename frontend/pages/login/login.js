/**
 * 登录页面
 * 处理微信小程序登录流程
 */

const auth = require('../../utils/auth');

Page({
  data: {
    loading: false,
    agreePolicy: false
  },

  onLoad() {
    // 检查是否已登录
    if (auth.isLoggedIn()) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 处理协议勾选
   */
  onPolicyChange(e) {
    this.setData({
      agreePolicy: e.detail.value
    });
  },

  /**
   * 微信登录按钮点击
   */
  async onWechatLogin() {
    if (!this.data.agreePolicy) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      // 1. 获取微信登录 code
      const { code } = await wx.login({ timeout: 10000 });

      if (!code) {
        throw new Error('获取登录 code 失败');
      }

      // 2. 调用后端登录接口
      const result = await auth.login(code);

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 3. 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 查看用户协议
   */
  viewPolicy() {
    wx.navigateTo({
      url: '/pages/policy/policy'
    });
  }
});

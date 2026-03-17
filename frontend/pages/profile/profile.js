/**
 * 个人中心页面
 * 显示用户信息、学习统计、设置等
 */

const auth = require('../../utils/auth');

Page({
  data: {
    user: null,
    stats: null,
    config: null,
    loading: true,
    showResetConfirm: false,
    resetReason: 'restart'
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    // 每次显示时刷新数据
    if (auth.isLoggedIn()) {
      this.loadProfile();
    }
  },

  /**
   * 加载用户资料
   */
  async loadProfile() {
    this.setData({ loading: true });

    try {
      const profile = await auth.getProfile();
      this.setData({
        user: profile.user,
        stats: profile.stats,
        config: profile.config,
        loading: false
      });
    } catch (error) {
      console.error('加载用户资料失败:', error);
      this.setData({ loading: false });
      
      if (error.message !== '登录已过期') {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 显示复位确认弹窗
   */
  showResetConfirm() {
    this.setData({ showResetConfirm: true });
  },

  /**
   * 隐藏复位确认弹窗
   */
  hideResetConfirm() {
    this.setData({ 
      showResetConfirm: false,
      resetReason: 'restart'
    });
  },

  /**
   * 选择复位原因
   */
  onReasonChange(e) {
    this.setData({ resetReason: e.detail.value });
  },

  /**
   * 确认复位学习进度
   */
  async confirmReset() {
    const { resetReason } = this.data;

    try {
      await auth.resetProgress(resetReason);
      
      wx.showToast({
        title: '已复位',
        icon: 'success'
      });

      this.hideResetConfirm();
      this.loadProfile(); // 刷新数据
    } catch (error) {
      console.error('复位失败:', error);
      wx.showToast({
        title: error.message || '复位失败',
        icon: 'none'
      });
    }
  },

  /**
   * 退出登录
   */
  async onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          await auth.logout();
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  /**
   * 跳转到管理员后台
   */
  goToAdmin() {
    if (auth.isAdmin()) {
      wx.navigateTo({
        url: '/pages/admin/index'
      });
    } else {
      wx.showToast({
        title: '无权限',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到设置页面
   */
  goToSettings() {
    wx.navigateTo({
      url: '/pages/config/config'
    });
  },

  /**
   * 跳转到错题本
   */
  goToMistakes() {
    wx.navigateTo({
      url: '/pages/mistakes/index'
    });
  },

  /**
   * 跳转到成就页面
   */
  goToAchievements() {
    wx.navigateTo({
      url: '/pages/achievements/index'
    });
  }
});

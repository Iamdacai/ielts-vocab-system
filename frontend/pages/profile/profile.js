// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    stats: {
      masteredWords: 0,
      practiceCount: 0
    },
    showResetModal: false,
    resetLoading: false,
    resetReasons: ['重新开始学习', '误操作导致混乱', '想挑战更高分数', '其他原因'],
    reasonIndex: 0
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    
    if (!userInfo || !token) {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    this.setData({ userInfo });
    
    // 加载详细统计
    this.loadStats();
  },

  /**
   * 加载统计数据
   */
  loadStats() {
    wx.request({
      url: `${app.globalData.apiUrl}/stats`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            'stats.masteredWords': res.data.mastered_words || 0,
            'stats.practiceCount': res.data.total_pronunciation || 0
          });
        }
      }
    });
  },

  /**
   * 跳转到发音练习
   */
  goToPronunciation() {
    wx.navigateTo({
      url: '/pages/pronunciation/pronunciation'
    });
  },

  /**
   * 跳转到成就系统
   */
  goToAchievements() {
    wx.navigateTo({
      url: '/pages/achievements/achievements'
    });
  },

  /**
   * 跳转到管理员后台
   */
  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/index'
    });
  },

  /**
   * 🆕 阻止事件冒泡
   */
  handleStopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },

  /**
   * 显示复位确认弹窗
   */
  goToReset() {
    this.setData({
      showResetModal: true,
      reasonIndex: 0
    });
  },

  /**
   * 关闭复位弹窗
   */
  closeResetModal() {
    this.setData({
      showResetModal: false
    });
  },

  /**
   * 选择复位原因
   */
  selectReason(e) {
    this.setData({
      reasonIndex: e.detail.value
    });
  },

  /**
   * 确认复位
   */
  confirmReset() {
    this.setData({ resetLoading: true });
    
    const reason = this.data.resetReasons[this.data.reasonIndex];
    
    wx.request({
      url: `${app.globalData.apiUrl}/users/reset-progress`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json'
      },
      data: {
        confirm: true,
        reason: reason
      },
      success: (res) => {
        this.setData({ resetLoading: false, showResetModal: false });
        
        if (res.statusCode === 200 && res.data.success) {
          wx.showToast({
            title: '复位成功',
            icon: 'success'
          });
          
          // 更新本地统计
          this.setData({
            'stats.masteredWords': 0,
            'stats.practiceCount': 0,
            'userInfo.totalWords': 0,
            'userInfo.studyDays': 0
          });
          
          // 保存到本地存储
          wx.setStorageSync('userInfo', this.data.userInfo);
        } else {
          wx.showToast({
            title: res.data.message || '复位失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        this.setData({ resetLoading: false });
        console.error('复位失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 退出登录
   */
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后需要重新登录才能继续学习',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          
          // 清除全局状态
          app.clearLoginStatus();
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
          
          // 跳转到登录页
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }, 1000);
        }
      }
    });
  }
});

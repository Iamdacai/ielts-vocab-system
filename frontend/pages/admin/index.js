// pages/admin/index.js
const app = getApp();

Page({
  data: {
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      totalWordsLearned: 0,
      newUsersToday: 0
    },
    users: [],
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    showResetAllModal: false,
    resetLoading: false
  },

  onLoad() {
    this.checkAdminPermission();
  },

  onShow() {
    this.loadStats();
    this.loadUsers();
  },

  /**
   * 检查管理员权限
   */
  checkAdminPermission() {
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo || userInfo.role !== 'admin') {
      wx.showModal({
        title: '无权限',
        content: '需要管理员权限才能访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }
  },

  /**
   * 加载全局统计
   */
  loadStats() {
    wx.request({
      url: `${app.globalData.apiUrl}/admin/stats`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ stats: res.data });
        }
      }
    });
  },

  /**
   * 加载用户列表
   */
  loadUsers() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    wx.request({
      url: `${app.globalData.apiUrl}/admin/users`,
      method: 'GET',
      data: {
        page: 1,
        pageSize: this.data.pageSize
      },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        this.setData({ loading: false });
        
        if (res.statusCode === 200) {
          const { users, total } = res.data;
          const hasMore = users.length < total;
          
          this.setData({
            users,
            page: 1,
            hasMore
          });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 加载更多用户
   */
  loadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    
    const nextPage = this.data.page + 1;
    this.setData({ loading: true });
    
    wx.request({
      url: `${app.globalData.apiUrl}/admin/users`,
      method: 'GET',
      data: {
        page: nextPage,
        pageSize: this.data.pageSize
      },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        this.setData({ loading: false });
        
        if (res.statusCode === 200) {
          const { users, total } = res.data;
          const currentUsers = this.data.users;
          const allUsers = [...currentUsers, ...users];
          const hasMore = allUsers.length < total;
          
          this.setData({
            users: allUsers,
            page: nextPage,
            hasMore
          });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 显示复位全部弹窗
   */
  showResetAllModal() {
    wx.showModal({
      title: '高危操作确认',
      content: '此操作将清空所有用户的学习进度，且不可恢复！请谨慎操作！',
      confirmText: '我已知晓风险',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.setData({ showResetAllModal: true });
        }
      }
    });
  },

  /**
   * 关闭复位弹窗
   */
  closeResetAllModal() {
    this.setData({ showResetAllModal: false });
  },

  /**
   * 确认复位全部
   */
  confirmResetAll() {
    this.setData({ resetLoading: true });
    
    wx.request({
      url: `${app.globalData.apiUrl}/admin/data-reset`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json'
      },
      data: {
        userIds: [],  // 空表示复位所有用户
        confirm: true,
        reason: '管理员手动复位'
      },
      success: (res) => {
        this.setData({ resetLoading: false, showResetAllModal: false });
        
        if (res.statusCode === 200 && res.data.success) {
          wx.showToast({
            title: `已复位 ${res.data.resetCount} 个用户`,
            icon: 'success'
          });
          
          // 🆕 清除本地缓存（管理员复位后）
          wx.removeStorageSync('ielts_vocab_progress');
          wx.removeStorageSync('userConfig');
          
          // 重新加载统计
          this.loadStats();
          this.loadUsers();
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
   * 查看系统日志
   */
  viewSystemLogs() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
});

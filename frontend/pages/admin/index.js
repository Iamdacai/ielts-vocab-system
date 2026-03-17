/**
 * 管理员后台页面
 * 用户管理、全局统计、数据复位等
 */

const auth = require('../../utils/auth');

Page({
  data: {
    stats: null,
    users: [],
    loading: true,
    page: 1,
    pageSize: 20,
    hasMore: true,
    activeTab: 'stats', // stats | users | logs
    showResetConfirm: false,
    selectedUserId: null
  },

  onLoad() {
    // 检查管理员权限
    if (!auth.isAdmin()) {
      wx.showToast({
        title: '无权限访问',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.loadStats();
    this.loadUsers();
  },

  /**
   * 加载全局统计
   */
  async loadStats() {
    try {
      const stats = await auth.getAdminStats();
      this.setData({ stats });
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  },

  /**
   * 加载用户列表
   */
  async loadUsers(refresh = false) {
    if (refresh) {
      this.setData({ page: 1, users: [], hasMore: true });
    }

    const { page, pageSize } = this.data;

    try {
      const result = await auth.getUserList(page, pageSize);
      
      this.setData({
        users: refresh ? result.users : [...this.data.users, ...result.users],
        page: page + 1,
        hasMore: result.page < result.totalPages
      });
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  },

  /**
   * 切换标签页
   */
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
  },

  /**
   * 下拉刷新
   */
  async onRefresh() {
    await this.loadStats();
    await this.loadUsers(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && this.data.activeTab === 'users') {
      this.loadUsers();
    }
  },

  /**
   * 修改用户角色
   */
  async changeRole(e) {
    const { id, role } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认修改',
      content: `确定将用户角色改为${role === 'admin' ? '管理员' : '普通用户'}？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await auth.request({
              url: 'https://caiyuyang.cn:3001/api/admin/users/' + id + '/role',
              method: 'POST',
              data: { role }
            });
            
            wx.showToast({ title: '修改成功', icon: 'success' });
            this.loadUsers(true);
          } catch (error) {
            wx.showToast({ title: '修改失败', icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 封禁/解封用户
   */
  async toggleBan(e) {
    const { id, status } = e.currentTarget.dataset;
    const action = status === 'active' ? 'ban' : 'unban';
    
    wx.showModal({
      title: '确认操作',
      content: `确定要${action === 'ban' ? '封禁' : '解封'}该用户？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await auth.request({
              url: `https://caiyuyang.cn:3001/api/admin/users/${id}/${action}`,
              method: 'POST',
              data: action === 'ban' ? { reason: '违规操作' } : {}
            });
            
            wx.showToast({ title: '操作成功', icon: 'success' });
            this.loadUsers(true);
          } catch (error) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 显示复位确认
   */
  showResetConfirm(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ 
      showResetConfirm: true,
      selectedUserId: id 
    });
  },

  /**
   * 隐藏复位确认
   */
  hideResetConfirm() {
    this.setData({ 
      showResetConfirm: false,
      selectedUserId: null 
    });
  },

  /**
   * 确认复位用户数据
   */
  async confirmReset() {
    const { selectedUserId } = this.data;
    
    try {
      await auth.request({
        url: 'https://caiyuyang.cn:3001/api/admin/data-reset',
        method: 'POST',
        data: {
          userIds: selectedUserId ? [selectedUserId] : [],
          confirm: true,
          reason: '管理员手动复位'
        }
      });
      
      wx.showToast({ title: '复位成功', icon: 'success' });
      this.hideResetConfirm();
      this.loadStats();
    } catch (error) {
      wx.showToast({ title: '复位失败', icon: 'none' });
    }
  }
});

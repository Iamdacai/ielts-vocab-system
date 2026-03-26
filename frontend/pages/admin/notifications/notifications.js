const app = getApp();

Page({
  data: {
    formData: {
      title: '',
      content: '',
      type: 'system',
      target_users: 'all'
    },
    notificationTypes: [
      { value: 'system', label: '📢 系统通知' },
      { value: 'maintenance', label: '🔧 系统维护' },
      { value: 'feature', label: '✨ 新功能' },
      { value: 'update', label: '🎉 功能更新' }
    ],
    targetOptions: [
      { value: 'all', label: '所有用户' },
      { value: 'active', label: '活跃用户' },
      { value: 'new', label: '新用户' }
    ],
    typeIndex: 0,
    targetIndex: 0,
    templates: [],
    history: [],
    loading: false
  },

  async onLoad() {
    await this.loadTemplates();
    await this.loadHistory();
  },

  /**
   * 加载通知模板
   */
  async loadTemplates() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/admin/notifications/templates`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        }
      });

      if (res.statusCode === 200) {
        this.setData({ templates: res.data.templates || [] });
      }
    } catch (err) {
      console.error('加载模板失败:', err);
    }
  },

  /**
   * 加载发送历史
   */
  async loadHistory() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/admin/notifications/history`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        }
      });

      if (res.statusCode === 200) {
        const history = (res.data.history || []).map(item => ({
          ...item,
          sent_at: item.sent_at ? item.sent_at.replace('T', ' ').substring(0, 16) : ''
        }));
        this.setData({ history });
      }
    } catch (err) {
      console.error('加载历史失败:', err);
    }
  },

  /**
   * 表单输入处理
   */
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  onContentInput(e) {
    this.setData({
      'formData.content': e.detail.value
    });
  },

  onTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      typeIndex: index,
      'formData.type': this.data.notificationTypes[index].value
    });
  },

  onTargetChange(e) {
    const index = e.detail.value;
    this.setData({
      targetIndex: index,
      'formData.target_users': this.data.targetOptions[index].value
    });
  },

  /**
   * 使用模板
   */
  useTemplate(e) {
    const templateId = e.currentTarget.dataset.id;
    const template = this.data.templates.find(t => t.id === templateId);
    
    if (template) {
      this.setData({
        'formData.title': template.title,
        'formData.content': template.content
      });
      
      wx.showToast({
        title: '已应用模板',
        icon: 'success'
      });
    }
  },

  /**
   * 发送通知
   */
  async sendNotification() {
    const { title, content } = this.data.formData;
    
    if (!title || !content) {
      wx.showToast({
        title: '请填写标题和内容',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认发送',
      content: `确定要发送通知"${title}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          this.setData({ loading: true });
          
          try {
            const response = await wx.request({
              url: `${app.globalData.apiUrl}/admin/notifications/send`,
              method: 'POST',
              header: {
                'Authorization': `Bearer ${wx.getStorageSync('token')}`,
                'Content-Type': 'application/json'
              },
              data: this.data.formData
            });

            if (response.statusCode === 200) {
              wx.showToast({
                title: '发送成功',
                icon: 'success'
              });
              
              // 清空表单
              this.setData({
                'formData.title': '',
                'formData.content': '',
                typeIndex: 0,
                targetIndex: 0,
                'formData.type': 'system',
                'formData.target_users': 'all'
              });
              
              // 刷新历史
              await this.loadHistory();
            } else {
              throw new Error(response.data.error || '发送失败');
            }
          } catch (err) {
            wx.showToast({
              title: err.message || '发送失败',
              icon: 'none'
            });
          } finally {
            this.setData({ loading: false });
          }
        }
      }
    });
  },

  /**
   * 重置词库更新标记
   */
  async resetLibraryUpdateFlag() {
    wx.showModal({
      title: '⚠️ 确认重置',
      content: '重置后，所有用户将再次看到词库更新提示弹窗。确定继续吗？',
      confirmColor: '#f44336',
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await wx.request({
              url: `${app.globalData.apiUrl}/admin/notifications/reset-flag`,
              method: 'POST',
              header: {
                'Authorization': `Bearer ${wx.getStorageSync('token')}`,
                'Content-Type': 'application/json'
              },
              data: {
                flag_name: 'library_update_notified'
              }
            });

            if (response.statusCode === 200) {
              wx.showToast({
                title: '重置成功',
                icon: 'success'
              });
            } else {
              throw new Error(response.data.error || '重置失败');
            }
          } catch (err) {
            wx.showToast({
              title: err.message || '重置失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});

// pages/ai-interests/ai-interests.js
const app = getApp();

Page({
  data: {
    // 兴趣标签
    interests: [
      { id: 'tech', name: '科技', icon: '💻', selected: false },
      { id: 'business', name: '商业', icon: '💼', selected: false },
      { id: 'entertainment', name: '娱乐', icon: '🎬', selected: false },
      { id: 'sports', name: '体育', icon: '⚽', selected: false },
      { id: 'travel', name: '旅行', icon: '✈️', selected: false },
      { id: 'food', name: '美食', icon: '🍳', selected: false },
      { id: 'science', name: '科学', icon: '🔬', selected: false },
      { id: 'art', name: '艺术', icon: '🎨', selected: false },
      { id: 'education', name: '教育', icon: '📚', selected: false },
      { id: 'health', name: '健康', icon: '🏥', selected: false },
      { id: 'environment', name: '环境', icon: '🌍', selected: false },
      { id: 'culture', name: '文化', icon: '🎭', selected: false }
    ],
    
    // 雅思场景分类（22 个）
    topicList: [
      { name: '自然地理', selected: false },
      { name: '植物研究', selected: false },
      { name: '动物保护', selected: false },
      { name: '太空探索', selected: false },
      { name: '学校教育', selected: false },
      { name: '科技发明', selected: false },
      { name: '文化历史', selected: false },
      { name: '语言演化', selected: false },
      { name: '娱乐运动', selected: false },
      { name: '物品材料', selected: false },
      { name: '时尚潮流', selected: false },
      { name: '饮食健康', selected: false },
      { name: '建筑场所', selected: false },
      { name: '交通旅行', selected: false },
      { name: '国家政府', selected: false },
      { name: '社会经济', selected: false },
      { name: '法律法规', selected: false },
      { name: '沙场争锋', selected: false },
      { name: '社会角色', selected: false },
      { name: '行为动作', selected: false },
      { name: '身心健康', selected: false },
      { name: '时间日期', selected: false }
    ],
    
    // AI 语境开关
    aiEnabled: true,
    
    loading: false,
    saving: false
  },

  onLoad() {
    this.loadUserInterests();
  },

  /**
   * 加载用户兴趣配置
   */
  async loadUserInterests() {
    this.setData({ loading: true });
    
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '请先登录',
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }

    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/ai/user-interests`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.statusCode === 200 && res.data.success) {
        const { interests, preferred_topics, ai_context_enabled } = res.data.data;
        
        // 恢复兴趣选择
        const interestsData = this.data.interests.map(item => ({
          ...item,
          selected: interests.includes(item.name)
        }));
        
        // 恢复场景选择
        const topicData = this.data.topicList.map(item => ({
          ...item,
          selected: preferred_topics && preferred_topics.includes(item.name)
        }));
        
        this.setData({
          interests: interestsData,
          topicList: topicData,
          aiEnabled: ai_context_enabled !== false
        });
      }
    } catch (error) {
      console.error('加载兴趣配置失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 切换兴趣标签
   */
  toggleInterest(e) {
    const { index } = e.currentTarget.dataset;
    const key = `interests[${index}].selected`;
    
    this.setData({
      [key]: !this.data.interests[index].selected
    });
  },

  /**
   * 切换场景分类
   */
  toggleTopic(e) {
    const { topic } = e.currentTarget.dataset;
    const key = `topicList[${this.data.topicList.findIndex(t => t.name === topic)}].selected`;
    
    this.setData({
      [key]: !this.data.topicList.find(t => t.name === topic).selected
    });
  },

  /**
   * 切换 AI 语境开关
   */
  toggleAISwitch() {
    this.setData({
      aiEnabled: !this.data.aiEnabled
    });
  },

  /**
   * 保存配置
   */
  async saveInterests() {
    // 验证至少选择一个兴趣
    const selectedInterests = this.data.interests
      .filter(item => item.selected)
      .map(item => item.name);
    
    if (selectedInterests.length === 0) {
      wx.showModal({
        title: '提示',
        content: '请至少选择一个兴趣标签',
        showCancel: false
      });
      return;
    }

    this.setData({ saving: true });

    try {
      const token = wx.getStorageSync('token');
      
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/ai/user-interests`,
        method: 'PUT',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          interests: selectedInterests,
          preferred_topics: this.data.selectedTopics,
          ai_context_enabled: this.data.aiEnabled
        }
      });

      if (res.statusCode === 200 && res.data.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存兴趣配置失败:', error);
      wx.showModal({
        title: '保存失败',
        content: error.message || '请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  /**
   * 重置为默认
   */
  resetToDefault() {
    wx.showModal({
      title: '确认重置',
      content: '将清除所有自定义选择，恢复默认设置',
      success: (res) => {
        if (res.confirm) {
          // 清空所有选择
          const interestsData = this.data.interests.map(item => ({
            ...item,
            selected: false
          }));
          
          this.setData({
            interests: interestsData,
            selectedTopics: [],
            aiEnabled: true
          });
          
          wx.showToast({
            title: '已重置',
            icon: 'none'
          });
        }
      }
    });
  }
});

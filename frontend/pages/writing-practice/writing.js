// pages/writing-practice/writing.js
const app = getApp();
const API_BASE = app.globalData.apiBase || 'https://caiyuyang.cn:3001/api';

Page({
  data: {
    topicList: [],
    taskType: 'task2',
    selectedTopic: null,
    essayText: '',
    wordCount: 0,
    feedback: null,
    totalPractices: 0,
    avgScore: 0,
    showFeedbackModal: false
  },

  onLoad() {
    this.loadTopics();
    this.loadStats();
  },

  // 加载题目列表
  async loadTopics() {
    try {
      const res = await wx.request({
        url: `${API_BASE}/writing/tasks?taskType=${this.data.taskType}&limit=10`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success) {
        this.setData({ topicList: res.data.data || [] });
      }
    } catch (error) {
      console.error('加载题目失败:', error);
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      const res = await wx.request({
        url: `${API_BASE}/writing/stats`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success) {
        const stats = res.data.data;
        this.setData({
          totalPractices: stats.total?.total_practices || 0,
          avgScore: stats.total?.avg_score?.toFixed(1) || 0
        });
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  },

  // 选择 Task 类型
  selectTaskType(e) {
    const taskType = e.currentTarget.dataset.type;
    this.setData({ taskType });
    this.loadTopics();
  },

  // 随机题目
  async getRandomTopic() {
    try {
      const res = await wx.request({
        url: `${API_BASE}/writing/tasks/random?taskType=${this.data.taskType}&count=1`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      if (res.data.success && res.data.data.length > 0) {
        this.setData({ 
          selectedTopic: res.data.data[0],
          essayText: '',
          wordCount: 0,
          feedback: null
        });
      }
    } catch (error) {
      console.error('获取随机题目失败:', error);
      wx.showToast({ title: '获取失败', icon: 'none' });
    }
  },

  // 选择题目
  selectTopic(e) {
    const topic = e.currentTarget.dataset.item;
    this.setData({ 
      selectedTopic: topic,
      essayText: '',
      wordCount: 0,
      feedback: null
    });
  },

  // 输入作文
  onEssayInput(e) {
    const text = e.detail.value;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.setData({ essayText: text, wordCount });
  },

  // 提交批改
  async submitEssay() {
    const { selectedTopic, essayText, wordCount } = this.data;

    if (!selectedTopic) {
      wx.showToast({ title: '请先选择题目', icon: 'none' });
      return;
    }

    if (wordCount < 100) {
      wx.showToast({ title: '作文字数太少', icon: 'none' });
      return;
    }

    wx.showLoading({ title: 'AI 批改中...' });

    try {
      const res = await wx.request({
        url: `${API_BASE}/writing/submit`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`,
          'Content-Type': 'application/json'
        },
        data: {
          taskId: selectedTopic.id,
          essayText,
          timeSpent: 0 // TODO: 记录写作时长
        }
      });

      wx.hideLoading();

      if (res.data.success) {
        const result = res.data.data;
        this.setData({
          feedback: {
            overallScore: result.score,
            taskResponseScore: result.taskResponseScore || result.bandScore,
            coherenceScore: result.coherenceScore || result.bandScore,
            vocabularyScore: result.vocabularyScore || result.bandScore,
            grammarScore: result.grammarScore || result.bandScore,
            feedback: result.feedback,
            strengths: result.strengths || ['结构清晰'],
            weaknesses: result.weaknesses || ['需要改进语法'],
            suggestions: result.suggestions || ['多练习复杂句']
          }
        });

        wx.showToast({ title: '批改完成', icon: 'success' });
        this.loadStats();
      } else {
        wx.showToast({ title: res.data.error || '批改失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('提交批改失败:', error);
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  },

  // 查看详情
  reviewFeedback() {
    this.setData({ showFeedbackModal: true });
  },

  // 关闭详情
  closeFeedbackModal() {
    this.setData({ showFeedbackModal: false });
  }
});

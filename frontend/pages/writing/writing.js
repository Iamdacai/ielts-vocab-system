// pages/writing/writing.js
const app = getApp();

Page({
  data: {
    essayType: 'task2',
    currentTopic: null,
    isWriting: false,
    essayContent: '',
    wordCount: 0,
    timer: 0,
    timerInterval: null,
    writingResult: null,
    submitting: false,
    topicLoading: false,
    topicLoadError: false
  },

  onLoad() {
    this.loadTopic();
  },

  onUnload() {
    this.stopTimer();
  },

  /**
   * 加载题目
   */
  async loadTopic() {
    this.setData({ topicLoading: true, topicLoadError: false });
    wx.showLoading({ title: '加载题目...' });
    
    try {
      const token = wx.getStorageSync('token');
      
      if (!token) {
        console.error('[写作] 未登录，token 为空');
        this.setData({ topicLoadError: true, topicLoading: false });
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }
      
      // 随机获取题目
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/writing/topics?task_type=${this.data.essayType}&count=1`,
        header: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[写作] 题目响应:', res.data);
      console.log('[写作] statusCode:', res.statusCode);
      console.log('[写作] data.data:', res.data ? res.data.data : 'undefined');
      console.log('[写作] data.data.length:', res.data && res.data.data ? res.data.data.length : 0);
      
      if (res.statusCode === 200 && res.data && res.data.success && res.data.data && res.data.data.length > 0) {
        const topic = res.data.data[0];
        console.log('[写作] 题目加载成功:', topic);
        console.log('[写作] topic.id:', topic.id);
        console.log('[写作] topic.topic:', topic.topic);
        console.log('[写作] topic.question:', topic.question ? topic.question.substring(0, 50) : 'undefined');
        
        this.setData({ 
          currentTopic: topic,
          topicLoading: false
        });
      } else {
        console.error('[写作] 题目数据为空或 success=false:', res.data);
        this.setData({ topicLoadError: true, topicLoading: false });
        wx.showModal({
          title: '提示',
          content: `题目加载失败 (status: ${res.statusCode})，请重试`,
          showCancel: false,
          success: () => {
            this.loadTopic();
          }
        });
      }
    } catch (error) {
      console.error('[写作] 加载题目失败:', error);
      this.setData({ topicLoadError: true, topicLoading: false });
      wx.showModal({
        title: '提示',
        content: '网络错误，请检查连接后重试',
        showCancel: false,
        success: () => {
          this.loadTopic();
        }
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 切换作文类型
   */
  switchType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ 
      essayType: type,
      currentTopic: null,
      essayContent: '',
      wordCount: 0,
      writingResult: null
    });
    this.loadTopic();
  },

  /**
   * 开始写作
   */
  startWriting() {
    this.setData({ isWriting: true });
    this.startTimer();
  },

  /**
   * 开始计时
   */
  startTimer() {
    const timer = setInterval(() => {
      this.setData({ timer: this.data.timer + 1 });
    }, 1000);
    
    this.setData({ timerInterval: timer });
  },

  /**
   * 停止计时
   */
  stopTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.setData({ timerInterval: null });
    }
  },

  /**
   * 输入监听
   */
  onInput(e) {
    const content = e.detail.value;
    const wordCount = this.countWords(content);
    
    this.setData({
      essayContent: content,
      wordCount
    });
  },

  /**
   * 统计单词数
   */
  countWords(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  },

  /**
   * 提交作文
   */
  async submitEssay() {
    const { essayContent, wordCount, currentTopic, essayType, topicLoading, topicLoadError } = this.data;
    
    // 验证题目是否正在加载
    if (topicLoading) {
      wx.showModal({
        title: '提示',
        content: '题目加载中，请稍候...',
        showCancel: false
      });
      return;
    }
    
    // 验证题目是否加载成功
    if (!currentTopic || !currentTopic.id) {
      console.error('[写作] 提交时题目为空:', currentTopic);
      wx.showModal({
        title: '提示',
        content: topicLoadError ? '题目加载失败，请刷新页面重试' : '题目未加载成功，请刷新页面重试',
        showCancel: false,
        success: () => {
          if (topicLoadError) {
            this.loadTopic();
          }
        }
      });
      return;
    }
    
    // 验证
    if (wordCount < 50) {
      wx.showModal({
        title: '提示',
        content: '作文字数太少，请至少写 50 个单词',
        showCancel: false
      });
      return;
    }
    
    if (this.data.submitting) return;
    
    this.setData({ submitting: true });
    wx.showLoading({ title: 'AI 批改中...', mask: true });
    
    try {
      const token = wx.getStorageSync('token');
      
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/writing/submit`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          topic_id: currentTopic.id,
          topic: currentTopic.topic,
          essay_type: essayType,
          content: essayContent,
          word_count: wordCount
        }
      });
      
      if (res.data.success) {
        this.setData({ writingResult: res.data.data });
        this.stopTimer();
        
        wx.showModal({
          title: '批改完成',
          content: `总分：${res.data.data.score}\n${res.data.data.feedback}`,
          showCancel: false
        });
      } else {
        throw new Error(res.data.error);
      }
    } catch (error) {
      console.error('[写作] 提交失败:', error);
      wx.showModal({
        title: '批改失败',
        content: error.message || '请稍后重试',
        showCancel: false
      });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },

  /**
   * 重新写作
   */
  retryWriting() {
    this.setData({
      writingResult: null,
      essayContent: '',
      wordCount: 0,
      timer: 0
    });
    this.startWriting();
  },

  /**
   * 换一题
   */
  newTopic() {
    wx.showLoading({ title: '加载中...' });
    this.setData({
      currentTopic: null,
      essayContent: '',
      wordCount: 0,
      timer: 0,
      writingResult: null,
      isWriting: false
    });
    this.loadTopic();
  }
});

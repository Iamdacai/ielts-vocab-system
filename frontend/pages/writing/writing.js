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
      const requestUrl = `${app.globalData.apiUrl}/writing/topics?task_type=${this.data.essayType}&count=1`;
      
      console.log('[写作] ========== 开始加载题目 ==========');
      console.log('[写作] token:', token ? '已获取 (长度:' + token.length + ')' : '未获取到');
      console.log('[写作] apiUrl:', app.globalData.apiUrl);
      console.log('[写作] requestUrl:', requestUrl);
      
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
      console.log('[写作] 发起 wx.request...');
      
      return new Promise((resolve, reject) => {
        wx.request({
          url: requestUrl,
          header: { 'Authorization': `Bearer ${token}` },
          method: 'GET',
          timeout: 10000,
          success: (result) => {
            console.log('[写作] ✅ request success');
            console.log('[写作] statusCode:', result.statusCode);
            console.log('[写作] data:', JSON.stringify(result.data, null, 2));
            
            if (result.statusCode === 200 && result.data && result.data.success && result.data.data && result.data.data.length > 0) {
              const topic = result.data.data[0];
              console.log('[写作] ✅ 题目解析成功:', topic.id, topic.topic);
              this.setData({ 
                currentTopic: topic,
                topicLoading: false
              });
              resolve();
            } else {
              console.error('[写作] ❌ 数据格式错误:', result.data);
              reject(new Error('数据格式错误'));
            }
          },
          fail: (error) => {
            console.error('[写作] ❌ request fail');
            console.error('[写作] errMsg:', error.errMsg);
            console.error('[写作] errno:', error.errno);
            console.error('[写作] 完整 error:', JSON.stringify(error, null, 2));
            
            this.setData({ topicLoadError: true, topicLoading: false });
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('[写作] ========== 加载题目失败 ==========');
      console.error('[写作] error:', error);
      
      this.setData({ topicLoadError: true, topicLoading: false });
      
      let errorMsg = '网络错误';
      if (error.errMsg) {
        if (error.errMsg.includes('timeout')) {
          errorMsg = '请求超时，请检查网络连接';
        } else if (error.errMsg.includes('fail')) {
          errorMsg = `请求失败：${error.errMsg}`;
        }
      }
      
      wx.showModal({
        title: '提示',
        content: `${errorMsg}\n\n请检查：\n1. 网络连接\n2. 服务器是否运行\n3. 域名是否配置`,
        showCancel: false,
        success: () => {
          this.loadTopic();
        }
      });
    } finally {
      console.log('[写作] ========== 加载结束 ==========');
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

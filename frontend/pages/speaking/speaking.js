// pages/speaking/speaking.js
const app = getApp();

Page({
  data: {
    practiceType: 'word', // word/sentence/conversation/mock
    practiceModes: [
      { id: 'word', name: '单词跟读', icon: '📖', desc: '练习单词发音' },
      { id: 'sentence', name: '句子跟读', icon: '💬', desc: '练习句子流利度' },
      { id: 'conversation', name: 'AI 对话', icon: '🤖', desc: '与 AI 考官对话' },
      { id: 'mock', name: '模拟考场', icon: '📝', desc: '全真模拟考试' }
    ],
    
    // 练习状态
    isRecording: false,
    recordingTime: 0,
    recordingTimer: null,
    recorderManager: null,
    
    // 当前题目
    currentQuestion: null,
    currentWord: null,
    
    // 评分结果
    practiceResult: null,
    
    // 对话模式
    conversationHistory: [],
    conversationSessionId: null,
    
    // 统计
    stats: null
  },

  onLoad() {
    this.initRecorder();
    this.loadStats();
  },

  onUnload() {
    this.stopRecording();
  },

  /**
   * 初始化录音管理器
   */
  initRecorder() {
    const recorderManager = wx.getRecorderManager();
    
    recorderManager.onStart(() => {
      console.log('[口语] 录音开始');
      this.setData({ isRecording: true, recordingTime: 0 });
      this.startRecordingTimer();
    });
    
    recorderManager.onStop((res) => {
      console.log('[口语] 录音停止', res);
      this.setData({ isRecording: false });
      this.stopRecordingTimer();
      
      if (res.tempFilePath) {
        this.submitRecording(res.tempFilePath, res.duration / 1000);
      }
    });
    
    recorderManager.onError((err) => {
      console.error('[口语] 录音错误:', err);
      this.setData({ isRecording: false });
      wx.showToast({
        title: '录音失败',
        icon: 'error'
      });
    });
    
    this.setData({ recorderManager });
  },

  /**
   * 选择练习类型
   */
  selectType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ 
      practiceType: type,
      practiceResult: null,
      currentQuestion: null
    });
    
    // 加载题目
    if (type === 'word' || type === 'sentence') {
      this.loadRandomQuestion(type);
    } else if (type === 'mock') {
      this.startMockTest();
    }
  },

  /**
   * 加载随机题目
   */
  async loadRandomQuestion(type) {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const token = wx.getStorageSync('token');
      
      if (type === 'word') {
        // 加载单词
        const res = await wx.request({
          url: `${app.globalData.apiUrl}/words/new?count=1`,
          header: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.data && res.data.length > 0) {
          this.setData({ currentWord: res.data[0] });
        }
      } else if (type === 'sentence') {
        // 加载句子（从题库随机）
        const res = await wx.request({
          url: `${app.globalData.apiUrl}/speaking/topics?part=1&count=1`,
          header: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.data && res.data.data && res.data.data.length > 0) {
          this.setData({ currentQuestion: res.data.data[0].question });
        }
      }
    } catch (error) {
      console.error('[口语] 加载题目失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 开始/停止录音
   */
  toggleRecording() {
    if (this.data.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },

  /**
   * 开始录音
   */
  startRecording() {
    const { recorderManager } = this.data;
    
    // 检查权限
    wx.getSetting({
      success: (settingRes) => {
        if (settingRes.authSetting['scope.record'] === false) {
          wx.showModal({
            title: '需要录音权限',
            content: '请在设置中允许录音权限',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
          return;
        }
        
        recorderManager.start({
          duration: 60000, // 最长 60 秒
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 96000,
          format: 'wav'
        });
        
        wx.showToast({
          title: '开始录音',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 停止录音
   */
  stopRecording() {
    const { recorderManager } = this.data;
    if (recorderManager) {
      recorderManager.stop();
    }
  },

  /**
   * 开始录音计时
   */
  startRecordingTimer() {
    const timer = setInterval(() => {
      this.setData({
        recordingTime: this.data.recordingTime + 1
      });
      
      // 最长录音 60 秒
      if (this.data.recordingTime >= 60) {
        this.stopRecording();
      }
    }, 1000);
    
    this.setData({ recordingTimer: timer });
  },

  /**
   * 停止录音计时
   */
  stopRecordingTimer() {
    if (this.data.recordingTimer) {
      clearInterval(this.data.recordingTimer);
      this.setData({ recordingTimer: null });
    }
  },

  /**
   * 提交录音评分
   */
  async submitRecording(tempFilePath, duration) {
    wx.showLoading({ title: '评分中...', mask: true });
    
    try {
      const token = wx.getStorageSync('token');
      const { practiceType, currentWord, currentQuestion } = this.data;
      
      // 1. 开始练习
      const startRes = await wx.request({
        url: `${app.globalData.apiUrl}/speaking/start`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          practice_type: practiceType,
          word_id: currentWord?.id,
          question: currentQuestion
        }
      });
      
      const practiceId = startRes.data.data.practiceId;
      
      // 2. 上传文件（使用 wx.uploadFile）
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${app.globalData.apiUrl}/speaking/submit`,
          filePath: tempFilePath,
          name: 'audio',
          header: {
            'Authorization': `Bearer ${token}`
          },
          formData: {
            practice_id: practiceId,
            audio_duration: duration
          },
          success: resolve,
          fail: reject
        });
      });
      
      const result = JSON.parse(uploadRes.data);
      
      if (result.success) {
        this.setData({ practiceResult: result.data });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[口语] 评分失败:', error);
      wx.showToast({
        title: '评分失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 重新练习
   */
  retryPractice() {
    this.setData({ practiceResult: null });
    this.loadRandomQuestion(this.data.practiceType);
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const token = wx.getStorageSync('token');
      
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/speaking/stats`,
        header: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.data.success) {
        this.setData({ stats: res.data.data });
      }
    } catch (error) {
      console.error('[口语] 加载统计失败:', error);
    }
  }
});

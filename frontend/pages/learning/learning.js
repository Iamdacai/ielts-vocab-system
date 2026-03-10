const app = getApp();

Page({
  data: {
    words: [],
    currentWordIndex: 0,
    currentWord: null,
    loading: true,
    showAnswer: false,
    progress: 0,
    totalWords: 0,
    audioContext: null,
    isPlaying: false,
    // 发音评分相关状态
    isRecording: false,
    pronunciationScore: null,
    pronunciationFeedback: '',
    recordingTempFilePath: null,
    recordingDuration: 0,
    hasRecordPermission: false
  },

  onLoad() {
    this.checkLoginAndLoad();
    this.initAudio();
    this.initRecorder();
    this.checkRecordPermission();
  },

  /**
   * 检查录音权限
   */
  checkRecordPermission() {
    wx.getSetting({
      success: (res) => {
        const hasPermission = res.authSetting['scope.record'] === true || 
                              res.authSetting['scope.record'] === undefined;
        this.setData({ hasRecordPermission: hasPermission });
      },
      fail: (err) => {
        console.error('检查权限失败:', err);
        this.setData({ hasRecordPermission: false });
      }
    });
  },

  /**
   * 初始化录音管理器（使用新版 API）
   */
  initRecorder() {
    const recorderManager = wx.getRecorderManager();
    
    recorderManager.onStart(() => {
      console.log('录音开始');
      this.setData({ 
        isRecording: true, 
        pronunciationScore: null, 
        pronunciationFeedback: '',
        recordingDuration: 0
      });
      
      const timer = setInterval(() => {
        if (this.data.isRecording) {
          this.setData({ recordingDuration: this.data.recordingDuration + 1 });
        } else {
          clearInterval(timer);
        }
      }, 1000);
      this.recordingTimer = timer;
    });

    recorderManager.onStop((res) => {
      console.log('录音停止', res);
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      
      this.setData({ 
        isRecording: false,
        recordingTempFilePath: res.tempFilePath,
        recordingDuration: 0
      });
      
      if (res.tempFilePath) {
        this.analyzePronunciation(res.tempFilePath);
      }
    });

    recorderManager.onError((err) => {
      console.error('录音错误:', err);
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      this.setData({ isRecording: false });
      
      let errorMsg = '录音失败';
      if (err.errMsg.includes('auth deny')) {
        errorMsg = '请授权录音权限';
        this.showPermissionDialog();
      } else if (err.errMsg.includes('not available')) {
        errorMsg = '录音功能不可用';
      }
      
      wx.showToast({ title: errorMsg, icon: 'error' });
    });

    this.recorderManager = recorderManager;
  },

  /**
   * 显示权限请求对话框
   */
  showPermissionDialog() {
    wx.showModal({
      title: '需要录音权限',
      content: '请允许录音权限以使用发音练习功能',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.record']) {
                this.setData({ hasRecordPermission: true });
                wx.showToast({ title: '权限已开启', icon: 'success' });
              }
            }
          });
        }
      }
    });
  },

  /**
   * 初始化音频播放器
   */
  initAudio() {
    const audioContext = wx.createInnerAudioContext();
    audioContext.autoplay = false;
    
    audioContext.onPlay(() => this.setData({ isPlaying: true }));
    audioContext.onPause(() => this.setData({ isPlaying: false }));
    audioContext.onStop(() => this.setData({ isPlaying: false }));
    audioContext.onEnded(() => this.setData({ isPlaying: false }));
    
    audioContext.onError((res) => {
      console.error('音频播放错误:', res.errMsg);
      this.setData({ isPlaying: false });
      wx.showToast({ title: '发音播放失败', icon: 'error', duration: 1500 });
    });
    
    this.setData({ audioContext });
  },

  async checkLoginAndLoad() {
    const isValid = await this.validateLoginStatus();
    if (isValid) {
      this.loadNewWords();
    } else {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  async validateLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      try {
        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: `${app.globalData.apiUrl}/health`,
            header: { 'Authorization': `Bearer ${token}` },
            success: resolve,
            fail: reject
          });
        });
        
        if (res.statusCode === 200) {
          app.globalData.token = token;
          app.globalData.userInfo = userInfo;
          app.globalData.hasLogin = true;
          return true;
        }
      } catch (err) {
        console.log('Token 验证失败:', err);
      }
    }
    
    app.globalData.hasLogin = false;
    app.globalData.token = null;
    app.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    return false;
  },

  loadNewWords() {
    wx.request({
      url: `${app.globalData.apiUrl}/words/new`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${app.globalData.token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          const words = res.data;
          this.setData({
            words: words,
            totalWords: words.length,
            loading: false
          });
          
          if (words.length > 0) {
            this.showNextWord();
          }
        } else if (res.statusCode === 403) {
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          setTimeout(() => wx.redirectTo({ url: '/pages/index/index' }), 1500);
        } else {
          this.setData({ loading: false });
          wx.showToast({ title: '加载失败', icon: 'error' });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        this.setData({ loading: false });
        wx.showToast({ title: '网络错误', icon: 'error' });
      }
    });
  },

  showNextWord() {
    const { words, currentWordIndex } = this.data;
    
    if (currentWordIndex < words.length) {
      const currentWord = words[currentWordIndex];
      this.setData({
        currentWord: currentWord,
        showAnswer: false,
        pronunciationScore: null,
        pronunciationFeedback: '',
        progress: ((currentWordIndex + 1) / words.length) * 100
      });
    } else {
      wx.showToast({ title: '今日新词学习完成！', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 2000);
    }
  },

  showPreviousWord() {
    const { currentWordIndex } = this.data;
    
    if (currentWordIndex > 0) {
      this.setData({ currentWordIndex: currentWordIndex - 1 });
      this.showNextWord();
    } else {
      wx.showToast({ title: '已经是第一个单词', icon: 'none' });
    }
  },

  showNextWordDirect() {
    const { currentWordIndex, totalWords } = this.data;
    
    if (currentWordIndex < totalWords - 1) {
      this.setData({ currentWordIndex: currentWordIndex + 1 });
      this.showNextWord();
    } else {
      wx.showToast({ title: '已经是最后一个单词', icon: 'none' });
    }
  },

  toggleAnswer() {
    this.setData({ showAnswer: !this.data.showAnswer });
  },

  /**
   * 播放单词发音 - 优化版本
   */
  async playWordPronunciation() {
    const { currentWord, audioContext } = this.data;
    if (!currentWord || !audioContext) return;

    let word = currentWord.word;
    if (word.includes('/')) {
      word = word.split('/')[0].trim();
    } else {
      word = word.split(' ')[0].trim();
    }
    
    if (this.data.isPlaying) {
      audioContext.stop();
    }

    try {
      const audioUrl = `${app.globalData.apiUrl}/pronunciation/word-audio/${encodeURIComponent(word)}`;
      audioContext.src = audioUrl;
    } catch (error) {
      console.error('播放发音失败:', error);
      wx.showToast({ title: '发音播放失败', icon: 'error', duration: 1500 });
      this.setData({ isPlaying: false });
    }
  },

  /**
   * 开始跟读录音 - 使用 RecorderManager
   */
  async startPronunciationPractice() {
    if (this.data.isRecording || !this.data.currentWord) return;
    
    // 检查权限
    if (!this.data.hasRecordPermission) {
      this.showPermissionDialog();
      return;
    }

    this.setData({ 
      isRecording: true, 
      pronunciationScore: null, 
      pronunciationFeedback: '' 
    });
    
    try {
      // 配置录音参数
      const options = {
        duration: 10000, // 最长录音 10 秒
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'wav'
      };
      
      this.recorderManager.start(options);
      wx.showToast({ title: '请开始跟读', icon: 'none', duration: 2000 });
      
    } catch (error) {
      console.error('录音启动失败:', error);
      wx.showToast({ title: '录音启动失败', icon: 'error' });
      this.setData({ isRecording: false });
    }
  },

  /**
   * 停止录音
   */
  stopRecording() {
    if (this.data.isRecording && this.recorderManager) {
      this.recorderManager.stop();
    }
  },

  /**
   * 分析发音并获取评分
   */
  analyzePronunciation(tempFilePath) {
    const { currentWord } = this.data;
    if (!currentWord) return;

    let word = currentWord.word;
    if (word.includes('/')) {
      word = word.split('/')[0].trim();
    } else {
      word = word.split(' ')[0].trim();
    }

    wx.showLoading({ title: '分析发音...' });
    
    wx.uploadFile({
      url: `${app.globalData.apiUrl}/pronunciation/analyze`,
      filePath: tempFilePath,
      name: 'audio',
      formData: { word: word },
      header: { 'Authorization': `Bearer ${app.globalData.token}` },
      success: (res) => {
        try {
          const result = JSON.parse(res.data);
          if (res.statusCode === 200) {
            this.setData({
              pronunciationScore: result.score,
              pronunciationFeedback: result.feedback
            });
            wx.showToast({ title: `得分：${result.score}/100`, icon: 'none', duration: 2000 });
          } else {
            throw new Error(result.message || '分析失败');
          }
        } catch (error) {
          console.error('解析分析结果失败:', error);
          wx.showToast({ title: '分析结果解析失败', icon: 'error' });
        }
      },
      fail: (err) => {
        console.error('上传分析失败:', err);
        wx.showToast({ title: '发音分析失败', icon: 'error' });
      },
      complete: () => {
        wx.hideLoading();
        this.setData({ isRecording: false });
      }
    });
  },

  handleKnow() {
    this.recordProgress('know', 75);
  },

  handleHard() {
    this.recordProgress('hard', 50);
  },

  handleForgot() {
    this.recordProgress('forgot', 25);
  },

  recordProgress(result, masteryScore) {
    const { currentWord, currentWordIndex } = this.data;
    
    wx.request({
      url: `${app.globalData.apiUrl}/words/progress`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        wordId: currentWord.id,
        result: result,
        masteryScore: masteryScore
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ currentWordIndex: currentWordIndex + 1 });
          this.showNextWord();
        } else if (res.statusCode === 403) {
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          setTimeout(() => wx.redirectTo({ url: '/pages/index/index' }), 1500);
        } else {
          wx.showToast({ title: '记录失败', icon: 'error' });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        wx.showToast({ title: '网络错误', icon: 'error' });
      }
    });
  },

  onUnload() {
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
    if (this.data.isRecording && this.recorderManager) {
      this.recorderManager.stop();
    }
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
    this.setData({
      words: [],
      currentWord: null,
      recordingTempFilePath: null
    });
  }
});

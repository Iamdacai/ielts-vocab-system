// pages/review/review.js - 复习课管理系统 v2.0
const app = getApp();
import { calculateNextStage, calculateNextReviewDate, REVIEW_STAGES } from '../../utils/memoryWheel';
import { getTodaySession, submitAnswer } from '../../utils/reviewSession';

Page({
  data: {
    // 模式切换
    isReviewing: false,  // false=九宫格模式，true=答题模式
    loading: true,
    today: '',
    
    // 九宫格数据
    wheelData: [],
    stats: {
      totalWords: 0,
      masteredWords: 0,
      masteryRate: 0
    },
    
    // 今日复习课
    todaySession: {
      hasSession: false,
      plannedWords: 0,
      completedWords: 0,
      status: 'none',
      estimatedMinutes: 0
    },
    
    // 复习答题模式数据
    session: null,
    hasSession: false,
    words: [],
    currentWord: null,
    currentIndex: 0,
    totalWords: 0,
    progress: 0,
    
    // 音频和录音
    audioContext: null,
    isPlaying: false,
    isRecording: false,
    recordingTime: 0,
    recordingTimer: null,
    recorderManager: null,
    pronunciationResult: null,
    
    // 界面状态
    showComplete: false,
    reviewResults: [],
    showAnswer: false,
    
    // 复习课统计
    counts: {
      mastered: 0,
      pending: 0,
      unknown: 0
    }
  },

  onLoad() {
    // 设置今日日期
    const today = new Date();
    this.setData({
      today: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    });
    
    this.checkLoginStatus();
    this.initAudio();
    this.initRecorder();
  },

  /**
   * 🆕 检查登录状态
   */
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '请先登录',
        content: '需要登录后才能进行复习',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      });
      return false;
    }
    return true;
  },

  onShow() {
    // 页面显示时检查登录状态并加载数据
    if (this.checkLoginStatus()) {
      this.loadDashboard();
    }
  },

  /**
   * 加载复习页面 Dashboard（九宫格 + 今日复习课）
   */
  async loadDashboard() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.apiUrl}/review/dashboard`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          },
          success: resolve,
          fail: reject
        });
      });
      
      if (res.statusCode === 200) {
        const { wheelData, todaySession, stats } = res.data;
        
        // 计算进度百分比
        let progressPercent = 0;
        if (todaySession.plannedWords > 0) {
          progressPercent = Math.round(todaySession.completedWords / todaySession.plannedWords * 100);
        }
        
        // 计算九宫格位置（圆圈布局）
        const wheelDataWithPos = wheelData.map((item, index) => {
          const angle = (index * 360 / 8) - 90; // 从顶部开始
          const radius = 120; // 圆圈中心到页面中心的距离
          const radian = angle * Math.PI / 180;
          const centerX = 150 + radius * Math.cos(radian);
          const centerY = 150 + radius * Math.sin(radian);
          const transform = `translate(${centerX - 40}px, ${centerY - 40}px)`;
          
          return {
            ...item,
            transform
          };
        });
        
        this.setData({
          wheelData: wheelDataWithPos,
          todaySession,
          stats,
          progressPercent,
          loading: false
        });
        
        wx.hideLoading();
      } else {
        throw new Error('加载失败');
      }
    } catch (err) {
      console.error('加载 Dashboard 失败:', err);
      this.setData({ loading: false });
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 开始复习
   */
  async startReview() {
    wx.showLoading({ title: '进入复习...' });
    
    try {
      const res = await getTodaySession();
      
      console.log('获取复习课响应:', res);
      
      if (res.statusCode === 200) {
        const data = res.data;
        
        if (!data.hasSession) {
          wx.showModal({
            title: '太棒了！',
            content: '今天没有待复习的单词',
            showCancel: false
          });
          return;
        }
        
        // 进入复习模式
        const { session, words } = data;
        
        console.log('session 对象:', session);
        console.log('session.id:', session?.id);
        
        if (!session || !session.id) {
          wx.showToast({
            title: '复习课数据错误',
            icon: 'error'
          });
          return;
        }
        
        const pendingCount = words.filter(w => w.item_status === 'pending').length;
        
        this.setData({
          isReviewing: true,
          hasSession: true,
          session: {
            id: session.id,
            sessionDate: session.sessionDate,
            plannedWords: session.planned_words || session.plannedWords,
            completedWords: session.completed_words || session.completedWords,
            status: session.status
          },
          words,
          totalWords: session.planned_words || session.plannedWords || words.length || 0,
          currentIndex: 0,
          counts: {
            mastered: session.completed_words || session.completedWords || 0,
            pending: pendingCount,
            unknown: 0
          }
        });
        
        console.log('当前 session:', this.data.session);
        
        if (words.length > 0) {
          this.showNextWord();
        }
        
        wx.hideLoading();
      } else {
        throw new Error('加载复习课失败');
      }
    } catch (err) {
      console.error('开始复习失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 返回九宫格模式
   */
  goBack() {
    if (this.data.isReviewing) {
      // 如果在复习模式中，确认是否退出
      wx.showModal({
        title: '确认退出',
        content: '退出后复习进度将自动保存，下次可以继续',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              isReviewing: false
            });
            // 重新加载 Dashboard
            this.loadDashboard();
          }
        }
      });
    } else {
      // 返回上一页
      wx.navigateBack();
    }
  },

  /**
   * 跳转到学习页面
   */
  goToLearning() {
    wx.navigateTo({
      url: '/pages/learning/learning'
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
    });

    this.setData({ audioContext });
  },

  /**
   * 显示下一个单词
   */
  showNextWord() {
    const { words } = this.data;
    
    // 过滤掉已完成的单词
    const pendingWords = words.filter(w => w.item_status === 'pending');
    
    if (pendingWords.length === 0) {
      // 所有单词已复习完
      this.showComplete();
      return;
    }
    
    const currentWord = pendingWords[0];
    
    this.setData({
      currentWord,
      showAnswer: false,
      pronunciationResult: null
    });
    
    // 自动播放发音
    this.playWordAudio(currentWord.word);
  },

  /**
   * 播放单词发音
   */
  playWordAudio() {
    const { currentWord, audioContext } = this.data;
    if (!currentWord || !currentWord.word || !audioContext) {
      console.error('播放失败：缺少必要参数');
      wx.showToast({ title: '无法播放', icon: 'error' });
      return;
    }

    // 清理单词：去掉音标和多余空格
    let word = currentWord.word;
    if (word.includes('/')) {
      word = word.split('/')[0].trim();
    }
    word = word.trim();

    if (!word) {
      console.error('播放失败：单词为空');
      wx.showToast({ title: '单词为空', icon: 'error' });
      return;
    }

    try {
      // 🆕 先停止当前播放，再设置新 URL
      audioContext.stop();
      
      // 等待一小段时间再播放，避免 play/pause 冲突
      setTimeout(() => {
        // 📝 生产环境使用后端 API，开发阶段可用有道直链测试
        // const audioUrl = `${app.globalData.apiUrl}/pronunciation/word-audio/${encodeURIComponent(word)}`;
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
        console.log('播放单词发音:', audioUrl);
        audioContext.src = audioUrl;
        audioContext.play();
      }, 100);
    } catch (error) {
      console.error('播放失败:', error);
      wx.showToast({ title: '播放失败', icon: 'error' });
    }
  },

  /**
   * 播放例句发音
   */
  playExampleAudio() {
    const { currentWord, audioContext } = this.data;
    if (!currentWord || !currentWord.example || !audioContext) return;

    try {
      // 🆕 先停止当前播放，再设置新 URL
      audioContext.stop();
      
      // 等待一小段时间再播放，避免 play/pause 冲突
      setTimeout(() => {
        // 📝 生产环境使用后端 API，开发阶段可用有道直链测试
        // const audioUrl = `${app.globalData.apiUrl}/pronunciation/sentence-audio/${encodeURIComponent(currentWord.example)}`;
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(currentWord.example)}&type=2`;
        console.log('播放例句发音:', audioUrl);
        audioContext.src = audioUrl;
        audioContext.play();
      }, 100);
    } catch (error) {
      console.error('播放失败:', error);
      wx.showToast({ title: '播放失败', icon: 'error' });
    }
  },

  /**
   * 处理认识
   */
  handleKnown() {
    const { showAnswer } = this.data;

    if (showAnswer) {
      this.recordResult('known');
    } else {
      this.recordResult('known');
    }
  },

  /**
   * 处理不认识
   */
  handleUnknown() {
    const { showAnswer } = this.data;

    if (!showAnswer) {
      this.setData({ showAnswer: true });
    } else {
      this.recordResult('unknown');
    }
  },

  /**
   * 记录学习结果
   */
  recordResult(result) {
    const { currentWord, counts } = this.data;

    if (!currentWord) {
      console.error('currentWord is null');
      return;
    }

    // 更新统计
    const newCounts = { ...counts };
    if (result === 'known') {
      newCounts.mastered++;
    } else {
      newCounts.unknown++;
    }

    // 保存结果
    const results = this.data.reviewResults;
    results.push({
      wordId: currentWord.id,
      result: result,
      stage: currentWord.stage || 0
    });

    this.setData({
      counts: newCounts,
      reviewResults: results
    });

    // 记录到后端
    this.saveProgress(result);
  },

  /**
   * 保存学习进度
   */
  async saveProgress(result) {
    const { currentWord, session } = this.data;

    console.log('saveProgress - session:', session);
    console.log('saveProgress - currentWord:', currentWord);

    if (!currentWord || !session || !session.id) {
      console.error('保存进度失败：currentWord 或 session 为空');
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      });
      return;
    }

    const currentStage = currentWord.stage || 0;
    const isCorrect = result === 'known';
    const nextStage = calculateNextStage(currentStage, isCorrect);

    try {
      console.log('提交答案:', {
        sessionId: session.id,
        wordId: currentWord.id,
        result,
        nextStage
      });
      
      const res = await submitAnswer(session.id, currentWord.id, result, nextStage);
      
      console.log('提交答案响应:', res);
      
      if (res.statusCode === 200) {
        const { session: updatedSession } = res.data;
        
        console.log('后端返回的 updatedSession:', updatedSession);
        
        const { counts, words } = this.data;
        const newCounts = { ...counts };
        
        // 🆕 统一字段名（兼容下划线和驼峰）
        const completedWords = updatedSession.completed_words || updatedSession.completedWords;
        const plannedWords = updatedSession.planned_words || updatedSession.plannedWords;
        const sessionId = updatedSession.id || this.data.session.id;
        
        if (isCorrect) {
          newCounts.mastered = completedWords;
        } else {
          newCounts.unknown++;
        }
        
        const updatedWords = words.map(w => 
          w.id === currentWord.id 
            ? { ...w, item_status: isCorrect ? 'correct' : 'wrong', result }
            : w
        );
        
        // 🆕 确保 session.id 始终存在
        this.setData({
          session: {
            id: sessionId,
            sessionDate: updatedSession.sessionDate || this.data.session.sessionDate,
            plannedWords: plannedWords,
            completedWords: completedWords,
            status: updatedSession.status || this.data.session.status
          },
          counts: newCounts,
          words: updatedWords,
          currentIndex: this.data.currentIndex + 1
        });
        
        console.log('更新后的 session:', this.data.session);
        
        this.showNextWord();
      }
    } catch (err) {
      console.error('保存进度失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  /**
   * 显示完成界面
   */
  showComplete() {
    this.setData({ showComplete: true });
  },

  /**
   * 完成复习
   */
  finishReview() {
    wx.showToast({
      title: '复习完成！',
      icon: 'success'
    });

    setTimeout(() => {
      this.setData({
        isReviewing: false,
        showComplete: false
      });
      this.loadDashboard();
    }, 1500);
  },

  /**
   * 初始化录音管理器
   */
  initRecorder() {
    const recorderManager = wx.getRecorderManager();

    recorderManager.onStart(() => {
      console.log('录音开始');
      this.setData({ isRecording: true, recordingTime: 0 });
      this.startRecordingTimer();
    });

    recorderManager.onStop((res) => {
      console.log('录音停止', res);
      this.setData({ isRecording: false });
      this.stopRecordingTimer();

      if (res.tempFilePath) {
        this.uploadPronunciation(res.tempFilePath);
      }
    });

    recorderManager.onError((err) => {
      console.error('录音错误:', err);
      this.setData({ isRecording: false });
      this.stopRecordingTimer();
      wx.showToast({
        title: '录音失败',
        icon: 'error'
      });
    });

    this.setData({ recorderManager });
  },

  /**
   * 开始录音计时
   */
  startRecordingTimer() {
    const timer = setInterval(() => {
      this.setData({
        recordingTime: this.data.recordingTime + 1
      });

      if (this.data.recordingTime >= 10) {
        this.stopPronunciationPractice();
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
   * 开始发音练习
   */
  startPronunciationPractice() {
    const { currentWord, recorderManager, isRecording } = this.data;

    if (!currentWord) {
      wx.showToast({
        title: '请先加载单词',
        icon: 'error'
      });
      return;
    }

    if (isRecording) {
      this.stopPronunciationPractice();
      return;
    }

    this.setData({ pronunciationResult: null });

    wx.authorize({
      scope: 'record',
      success: () => {
        recorderManager.start({
          duration: 10000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: 'mp3'
        });

        wx.showToast({
          title: '开始录音',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showModal({
          title: '需要录音权限',
          content: '请在设置中允许录音权限，以便进行发音练习',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  /**
   * 停止发音练习
   */
  stopPronunciationPractice() {
    const { recorderManager } = this.data;

    if (recorderManager) {
      recorderManager.stop();
      wx.showToast({
        title: '录音完成',
        icon: 'success'
      });
    }
  },

  /**
   * 上传发音进行评分
   */
  uploadPronunciation(tempFilePath) {
    const { currentWord } = this.data;

    if (!currentWord || !currentWord.word) {
      wx.showToast({
        title: '单词信息缺失',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({
      title: '评分中...',
      mask: true
    });

    wx.uploadFile({
      url: `${app.globalData.apiUrl}/pronunciation/analyze`,
      filePath: tempFilePath,
      name: 'audio',
      formData: {
        word: currentWord.word
      },
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
      success: (uploadRes) => {
        wx.hideLoading();

        if (uploadRes.statusCode === 200) {
          try {
            const result = JSON.parse(uploadRes.data);
            console.log('发音评分结果:', result);

            this.setData({
              pronunciationResult: {
                score: result.score || 0,
                accuracy: result.accuracy || 0,
                fluency: result.fluency || 0,
                feedback: result.feedback || '请继续练习'
              }
            });

            wx.showToast({
              title: `评分：${result.score}`,
              icon: 'success',
              duration: 2000
            });
          } catch (e) {
            console.error('解析评分结果失败:', e);
            wx.showToast({
              title: '评分失败',
              icon: 'error'
            });
          }
        } else {
          wx.showToast({
            title: '评分失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('上传失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  onUnload() {
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
    if (this.data.recorderManager) {
      this.data.recorderManager.stop();
    }
  }
});

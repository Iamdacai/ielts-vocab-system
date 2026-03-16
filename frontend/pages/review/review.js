// pages/review/review.js - 复习课模式
const app = getApp();
import { calculateNextStage, calculateNextReviewDate } from '../../utils/memoryWheel';
import { getTodaySession, submitAnswer } from '../../utils/reviewSession';

Page({
  data: {
    // 复习课信息
    session: null,
    hasSession: false,

    // 单词列表
    words: [],
    currentWord: null,
    currentIndex: 0,
    totalWords: 0,
    progress: 0,
    loading: true,

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
    showAnswer: false,  // 是否显示答案

    // 复习课统计
    counts: {
      correct: 0,
      wrong: 0,
      pending: 0
    }
  },

  onLoad() {
    this.initAudio();
    this.initRecorder();
    this.loadReviewSession();
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
   * 加载复习课
   */
  async loadReviewSession() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await getTodaySession();
      
      if (res.statusCode === 200) {
        const data = res.data;
        
        if (!data.hasSession) {
          // 没有复习课
          this.setData({ loading: false, hasSession: false });
          wx.showModal({
            title: '太棒了！',
            content: '今天没有待复习的单词',
            showCancel: false,
            success: () => wx.navigateBack()
          });
          return;
        }
        
        // 有复习课
        const { session, words } = data;
        const pendingCount = words.filter(w => w.item_status === 'pending').length;
        
        this.setData({
          hasSession: true,
          session,
          words,
          totalWords: session.planned_words || words.length || 0,
          currentIndex: 0,
          loading: false,
          counts: {
            correct: session.completed_words || 0,
            wrong: 0,
            pending: pendingCount
          }
        });
        
        if (words.length > 0) {
          this.showNextWord();
        }
        
        wx.hideLoading();
      } else {
        throw new Error('加载失败');
      }
    } catch (err) {
      console.error('加载复习课失败:', err);
      this.setData({ loading: false });
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
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
   * 播放单词发音 - 🆕 修复：确保正确获取 cleanWord
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

    if (this.data.isPlaying) {
      audioContext.stop();
    }

    try {
      const audioUrl = `${app.globalData.apiUrl}/pronunciation/word-audio/${encodeURIComponent(word)}`;
      console.log('播放单词发音:', audioUrl);
      audioContext.src = audioUrl;
      audioContext.play();
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

    if (this.data.isPlaying) {
      audioContext.stop();
    }

    try {
      audioContext.src = `${app.globalData.apiUrl}/pronunciation/sentence-audio/${encodeURIComponent(currentWord.example)}`;
    } catch (error) {
      console.error('播放失败:', error);
      wx.showToast({ title: '播放失败', icon: 'error' });
    }
  },

  /**
   * 🆕 处理认识 - 如果已显示答案，可以直接记录结果
   */
  handleKnown() {
    const { showAnswer } = this.data;

    if (showAnswer) {
      // 已显示答案，直接记录
      this.recordResult('known');
    } else {
      // 未显示答案，认为认识，直接下一个
      this.recordResult('known');
    }
  },

  /**
   * 🆕 处理不认识 - 先显示答案，再次点击才记录结果
   */
  handleUnknown() {
    const { showAnswer } = this.data;

    if (!showAnswer) {
      // 第一次点击：显示答案
      this.setData({ showAnswer: true });
    } else {
      // 第二次点击：记录结果并进入下一个单词
      this.recordResult('unknown');
    }
  },

  /**
   * 记录学习结果
   */
  recordResult(result) {
    const { currentWord, currentIndex, words, counts } = this.data;

    // 添加 null 检查
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

    // 下一个单词
    this.setData({ currentIndex: currentIndex + 1 });
    this.showNextWord();
  },

  /**
   * 保存学习进度（复习课模式）
   */
  async saveProgress(result) {
    const { currentWord, session } = this.data;

    if (!currentWord || !session) {
      console.error('保存进度失败：currentWord 或 session 为空');
      return;
    }

    // 计算下一阶段
    const currentStage = currentWord.stage || 0;
    const isCorrect = result === 'known';
    const nextStage = calculateNextStage(currentStage, isCorrect);

    try {
      const res = await submitAnswer(session.id, currentWord.id, result, nextStage);
      
      if (res.statusCode === 200) {
        const { session: updatedSession } = res.data;
        
        // 更新界面统计
        const { counts, words } = this.data;
        const newCounts = { ...counts };
        
        if (isCorrect) {
          newCounts.correct = updatedSession.completedWords;
        } else {
          newCounts.wrong++;
        }
        
        // 更新单词状态
        const updatedWords = words.map(w => 
          w.id === currentWord.id 
            ? { ...w, item_status: isCorrect ? 'correct' : 'wrong', result }
            : w
        );
        
        this.setData({
          session: updatedSession,
          counts: newCounts,
          words: updatedWords
        });
        
        console.log(`[复习课] 进度：${updatedSession.completedWords}/${updatedSession.plannedWords}`);
      }
    } catch (err) {
      console.error('保存进度失败:', err);
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
      wx.navigateBack();
    }, 1500);
  },

  onUnload() {
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
    if (this.data.recorderManager) {
      this.data.recorderManager.stop();
    }
  },

  /**
   * 🆕 初始化录音管理器
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
   * 🆕 开始录音计时
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
   * 🆕 停止录音计时
   */
  stopRecordingTimer() {
    if (this.data.recordingTimer) {
      clearInterval(this.data.recordingTimer);
      this.setData({ recordingTimer: null });
    }
  },

  /**
   * 🆕 开始发音练习
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
   * 🆕 停止发音练习
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
   * 🆕 上传发音进行评分
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
  }
});

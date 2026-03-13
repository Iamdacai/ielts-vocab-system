// pages/learning/learning.js - 学时确认优化版
const app = getApp();
import { loadProgress, startLearningSession, completeLearningSession, updateWordProgress } from '../../utils/progressManager';

Page({
  data: {
    words: [],
    currentWord: null,
    currentIndex: 0,
    totalWords: 0,
    progress: 0,
    loading: true,
    audioContext: null,
    isPlaying: false,
    
    // 学时确认
    showDurationModal: false,
    sessionStartTime: null,
    elapsedSeconds: 0,
    confirmedDuration: null,
    formattedDuration: '00:00',
    durationTimer: null,
    
    // 会话统计
    sessionStats: {
      newWords: 0,
      reviewWords: 0,
      masteredWords: 0
    },
    
    showComplete: false,
    sessionId: null
  },

  onLoad() {
    this.initAudio();
    this.startDurationTimer();
    this.loadNewWords();
  },

  onShow() {
    // 页面显示时继续计时
    if (!this.data.showDurationModal && !this.data.showComplete) {
      this.startDurationTimer();
    }
  },

  onHide() {
    // 页面隐藏时暂停计时
    this.stopDurationTimer();
  },

  onUnload() {
    this.stopDurationTimer();
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
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
   * 开始计时
   */
  startDurationTimer() {
    if (this.data.durationTimer) return;
    
    const startTime = this.data.sessionStartTime || new Date().getTime();
    this.setData({ sessionStartTime: startTime });
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      this.setData({
        elapsedSeconds: elapsed,
        formattedDuration: formatted
      });
    }, 1000);
    
    this.setData({ durationTimer: timer });
  },

  /**
   * 停止计时
   */
  stopDurationTimer() {
    if (this.data.durationTimer) {
      clearInterval(this.data.durationTimer);
      this.setData({ durationTimer: null });
    }
  },

  /**
   * 加载新词
   */
  loadNewWords() {
    wx.request({
      url: `${app.globalData.apiUrl}/words/new`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
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
            
            // 创建学习会话
            const sessionId = startLearningSession(
              loadProgress(),
              'ielts-core',
              'new'
            );
            this.setData({ sessionId });
          } else {
            wx.showToast({
              title: '今日新词已学完',
              icon: 'success'
            });
            setTimeout(() => wx.navigateBack(), 1500);
          }
        } else {
          this.setData({ loading: false });
          wx.showToast({
            title: '加载失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('加载失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 显示下一个单词
   */
  showNextWord() {
    const { words, currentIndex, totalWords } = this.data;
    
    if (currentIndex < totalWords) {
      const currentWord = words[currentIndex];
      this.setData({
        currentWord: currentWord,
        progress: ((currentIndex + 1) / totalWords) * 100
      });
    } else {
      // 完成所有单词，显示学时确认
      this.showDurationModal();
    }
  },

  /**
   * 播放单词发音
   */
  playWordAudio() {
    const { currentWord, audioContext } = this.data;
    if (!currentWord || !audioContext) return;

    let word = currentWord.word;
    if (word.includes('/')) {
      word = word.split('/')[0].trim();
    }
    
    if (this.data.isPlaying) {
      audioContext.stop();
    }

    try {
      audioContext.src = `${app.globalData.apiUrl}/pronunciation/word-audio/${encodeURIComponent(word)}`;
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
   * 处理认识
   */
  handleKnow() {
    this.recordResult('know', 75);
  },

  /**
   * 处理困难
   */
  handleHard() {
    this.recordResult('hard', 50);
  },

  /**
   * 处理忘记
   */
  handleForgot() {
    this.recordResult('forgot', 25);
  },

  /**
   * 记录学习结果
   */
  recordResult(result, masteryScore) {
    const { currentWord, currentIndex, sessionStats } = this.data;
    
    // 添加 null 检查
    if (!currentWord) {
      console.error('currentWord is null');
      return;
    }
    
    // 更新统计
    const newStats = { ...sessionStats };
    if (result === 'know') {
      newStats.masteredWords++;
    }
    newStats.newWords = currentIndex + 1;
    
    this.setData({ sessionStats: newStats });
    
    // 保存进度到后端
    this.saveProgress(result, masteryScore);
    
    // 下一个单词
    this.setData({ currentIndex: currentIndex + 1 });
    this.showNextWord();
  },

  /**
   * 保存学习进度
   */
  saveProgress(result, masteryScore) {
    const { currentWord } = this.data;
    
    // 添加 null 检查
    if (!currentWord) {
      console.error('保存进度失败：currentWord is null');
      return;
    }
    
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
        if (res.statusCode !== 200) {
          console.error('保存进度失败:', res);
        }
      },
      fail: (err) => {
        console.error('保存失败:', err);
      }
    });
  },

  /**
   * 显示学时确认弹窗
   */
  showDurationModal() {
    this.stopDurationTimer();
    this.setData({ showDurationModal: true });
  },

  /**
   * 设置学习时长
   */
  setDuration(e) {
    const minutes = e.currentTarget.dataset.minutes;
    this.setData({
      confirmedDuration: minutes,
      elapsedSeconds: minutes * 60,
      formattedDuration: `${String(minutes).padStart(2, '0')}:00`
    });
  },

  /**
   * 确认学习时长
   */
  confirmDuration() {
    const { sessionId, elapsedSeconds, sessionStats } = this.data;
    const confirmed = this.data.confirmedDuration !== null;
    
    // 完成学习会话
    const progressData = loadProgress();
    completeLearningSession(
      progressData,
      sessionId,
      {
        duration: elapsedSeconds,
        newWords: sessionStats.newWords,
        reviewedWords: 0,
        masteredWords: sessionStats.masteredWords
      },
      confirmed
    );
    
    // 保存到后端
    this.saveSessionToBackend(elapsedSeconds, confirmed);
    
    // 显示完成界面
    this.setData({
      showDurationModal: false,
      showComplete: true
    });
    
    // 1.5 秒后返回
    setTimeout(() => {
      wx.navigateBack();
    }, 2000);
  },

  /**
   * 跳过学时确认
   */
  skipDuration() {
    const { sessionId, elapsedSeconds, sessionStats } = this.data;
    
    const progressData = loadProgress();
    completeLearningSession(
      progressData,
      sessionId,
      {
        duration: elapsedSeconds,
        newWords: sessionStats.newWords,
        reviewedWords: 0,
        masteredWords: sessionStats.masteredWords
      },
      false
    );
    
    this.saveSessionToBackend(elapsedSeconds, false);
    
    wx.navigateBack();
  },

  /**
   * 保存会话到后端
   */
  saveSessionToBackend(duration, confirmed) {
    const { sessionStats } = this.data;
    
    wx.request({
      url: `${app.globalData.apiUrl}/sessions`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        duration: duration,
        newWords: sessionStats.newWords,
        reviewedWords: 0,
        masteredWords: sessionStats.masteredWords,
        confirmedDuration: confirmed
      },
      success: (res) => {
        if (res.statusCode !== 200) {
          console.error('保存会话失败:', res);
        }
      },
      fail: (err) => {
        console.error('保存失败:', err);
      }
    });
  }
});

// pages/review/review.js - 剪纸盒风格复习
const app = getApp();
import { calculateNextStage, calculateNextReviewDate } from '../../utils/memoryWheel';

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
    
    // 剪纸盒统计
    counts: {
      mastered: 0,
      pending: 0,
      unknown: 0
    },
    
    showComplete: false,
    reviewResults: []
  },

  onLoad() {
    this.initAudio();
    this.loadReviewWords();
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
   * 加载待复习单词
   */
  loadReviewWords() {
    wx.request({
      url: `${app.globalData.apiUrl}/words/review`,
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
          } else {
            wx.showToast({
              title: '没有待复习的单词',
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
      // 完成所有单词
      this.showComplete();
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
  handleKnown() {
    this.recordResult('known');
  },

  /**
   * 处理不认识
   */
  handleUnknown() {
    this.recordResult('unknown');
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
   * 保存学习进度
   */
  saveProgress(result) {
    const { currentWord } = this.data;
    
    // 添加 null 检查
    if (!currentWord) {
      console.error('保存进度失败：currentWord is null');
      return;
    }
    
    // 计算下一阶段
    const currentStage = currentWord.stage || 0;
    const isCorrect = result === 'known';
    const nextStage = calculateNextStage(currentStage, isCorrect);
    const nextReviewDate = calculateNextReviewDate(new Date(), nextStage);
    
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
        stage: nextStage,
        nextReviewDate: nextReviewDate.toISOString(),
        masteryScore: isCorrect ? 75 : 25
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
  }
});

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
      
      // 🆕 预处理分类名称（去掉编号前缀）
      let categoryName = '';
      if (currentWord.category) {
        // 去掉 "01_" 这样的编号前缀
        categoryName = currentWord.category.replace(/^\d+_/, '');
      }
      
      this.setData({
        currentWord: {
          ...currentWord,
          categoryName: categoryName
        },
        progress: ((currentIndex + 1) / totalWords) * 100
      });
    } else {
      // 完成所有单词，显示学时确认
      this.showDurationModal();
    }
  },

  /**
   * 播放单词发音（🆕 支持词汇音频）
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
      // 🆕 优先使用词汇音频（如果有 category 字段）
      if (currentWord.category && currentWord.source && currentWord.source.includes('真经')) {
        // 🆕 真经词库：需要添加编号前缀（如"03_动物保护"）
        const category = this.getCategoryWithPrefix(currentWord.category);
        // 修复：去掉多余的 /audio 路径
        const audioUrl = `${app.globalData.apiUrl}/audio/vocabulary/${encodeURIComponent(category)}/${encodeURIComponent(word)}.mp3`;
        console.log('尝试播放词汇音频:', audioUrl);
        
        // 先检查词汇音频是否存在
        wx.request({
          url: audioUrl,
          method: 'HEAD',
          success: (checkRes) => {
            if (checkRes.statusCode === 200) {
              // 音频存在，播放
              audioContext.src = audioUrl;
              audioContext.play();
              console.log('✅ 词汇音频播放成功');
            } else {
              // 音频不存在，使用备用发音服务
              console.log('词汇音频不存在，使用备用发音');
              this.playFallbackAudio(word, audioContext);
            }
          },
          fail: () => {
            // 请求失败，使用备用发音服务
            console.log('词汇音频请求失败，使用备用发音');
            this.playFallbackAudio(word, audioContext);
          }
        });
      } else {
        // 使用原有发音服务
        this.playFallbackAudio(word, audioContext);
      }
    } catch (error) {
      console.error('播放失败:', error);
      wx.showToast({ title: '播放失败', icon: 'error' });
    }
  },

  /**
   * 获取带编号前缀的分类名（真经词库专用）
   * 如："动物保护" → "03_动物保护"
   */
  getCategoryWithPrefix(categoryName) {
    // 真经 22 个分类的编号映射
    const categoryMap = {
      '自然地理': '01_自然地理',
      '植物研究': '02_植物研究',
      '动物保护': '03_动物保护',
      '太空探索': '04_太空探索',
      '学校教育': '05_学校教育',
      '科技发明': '06_科技发明',
      '文化历史': '07_文化历史',
      '语言演化': '08_语言演化',
      '娱乐运动': '09_娱乐运动',
      '物品材料': '10_物品材料',
      '时尚潮流': '11_时尚潮流',
      '饮食健康': '12_饮食健康',
      '建筑场所': '13_建筑场所',
      '交通旅行': '14_交通旅行',
      '国家政府': '15_国家政府',
      '社会经济': '16_社会经济',
      '法律法规': '17_法律法规',
      '沙场争锋': '18_沙场争锋',
      '社会角色': '19_社会角色',
      '行为动作': '20_行为动作',
      '身心健康': '21_身心健康',
      '时间日期': '22_时间日期'
    };
    
    return categoryMap[categoryName] || categoryName;
  },

  /**
   * 备用发音播放（当词汇音频不存在时）
   */
  playFallbackAudio(word, audioContext) {
    try {
      audioContext.src = `${app.globalData.apiUrl}/pronunciation/word-audio/${encodeURIComponent(word)}`;
      audioContext.play();
      console.log('✅ 备用发音播放成功');
    } catch (error) {
      console.error('备用发音也失败:', error);
      wx.showToast({ title: '无法播放', icon: 'error' });
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

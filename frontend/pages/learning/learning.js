const app = getApp();

Page({
  data: {
    words: [],
    currentWordIndex: 0,
    currentWord: null,
    loading: true,
    showAnswer: false,
    progress: 0,
    totalWords: 0
  },

  onLoad() {
    this.checkLoginAndLoad();
  },

  async checkLoginAndLoad() {
    // 验证登录状态
    const isValid = await this.validateLoginStatus();
    if (isValid) {
      this.loadNewWords();
    } else {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  async validateLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      // 验证token是否有效
      try {
        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: `${app.globalData.apiUrl}/health`,
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: resolve,
            fail: reject
          });
        });
        
        if (res.statusCode === 200) {
          // token有效，更新全局数据
          app.globalData.token = token;
          app.globalData.userInfo = userInfo;
          app.globalData.hasLogin = true;
          return true;
        }
      } catch (err) {
        console.log('Token验证失败:', err);
      }
    }
    
    // token无效或不存在
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
          }
        } else if (res.statusCode === 403) {
          // token过期，重新登录
          wx.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none'
          });
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/index/index'
            });
          }, 1500);
        } else {
          console.error('加载新词失败:', res);
          this.setData({ loading: false });
          wx.showToast({
            title: '加载失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
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
        progress: ((currentWordIndex + 1) / words.length) * 100
      });
    } else {
      // 所有单词学习完成
      wx.showToast({
        title: '今日新词学习完成！',
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  toggleAnswer() {
    this.setData({
      showAnswer: !this.data.showAnswer
    });
  },

  handleMastered() {
    this.recordProgress(true, 5, 'mastered');
  },

  handleKnow() {
    this.recordProgress(true, 3, 'test');
  },

  handleHard() {
    this.recordProgress(false, 2, 'test');
  },

  handleForgot() {
    this.recordProgress(false, 1, 'test');
  },

  recordProgress(isCorrect, confidence, actionType) {
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
        isCorrect: isCorrect,
        confidence: confidence,
        actionType: actionType
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 移动到下一个单词
          this.setData({
            currentWordIndex: currentWordIndex + 1
          });
          this.showNextWord();
        } else if (res.statusCode === 403) {
          // token过期
          wx.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none'
          });
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/index/index'
            });
          }, 1500);
        } else {
          console.error('记录进度失败:', res);
          wx.showToast({
            title: '记录失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  onUnload() {
    // 页面卸载时清理数据
    this.setData({
      words: [],
      currentWord: null
    });
  }
});
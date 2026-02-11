// pages/review/review.js
const app = getApp();

Page({
  data: {
    currentWord: null,
    loading: true,
    hasMoreWords: true,
    reviewedCount: 0,
    totalWordsToday: 0,
    showAnswer: false,
    confidence: 3 // 默认自信度
  },

  onLoad() {
    this.checkLoginAndLoadReview();
  },

  async checkLoginAndLoadReview() {
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
          // token有效
          app.globalData.token = token;
          app.globalData.userInfo = userInfo;
          app.globalData.hasLogin = true;
          this.loadReviewWord();
          return;
        }
      } catch (err) {
        console.log('Token验证失败:', err);
      }
    }
    
    // token无效或不存在，跳转到首页
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/index/index'
      });
    }, 1500);
  },

  loadReviewWord() {
    this.setData({ loading: true, showAnswer: false });
    
    wx.request({
      url: `${app.globalData.apiUrl}/words/review`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const words = res.data;
          if (words.length > 0) {
            this.setData({ 
              currentWord: words[0],
              loading: false,
              hasMoreWords: true,
              totalWordsToday: words.length
            });
          } else {
            this.setData({ 
              currentWord: null,
              loading: false,
              hasMoreWords: false
            });
          }
        } else if (res.statusCode === 403) {
          // token无效，重新登录
          wx.showToast({
            title: '请重新登录',
            icon: 'none'
          });
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/index/index'
            });
          }, 1500);
        } else {
          console.error('加载复习单词失败:', res);
          this.setData({ loading: false, hasMoreWords: false });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        this.setData({ loading: false, hasMoreWords: false });
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  showAnswer() {
    this.setData({ showAnswer: true });
  },

  setConfidence(e) {
    const confidence = parseInt(e.currentTarget.dataset.confidence);
    this.setData({ confidence });
  },

  // 根据自信度映射掌握度评分
  getMasteryScoreFromConfidence(confidence, isCorrect) {
    if (isCorrect) {
      // 回答正确：自信度1-5对应掌握度50-95
      const scores = [50, 65, 75, 85, 95];
      return scores[confidence - 1] || 75;
    } else {
      // 回答错误：自信度1-5对应掌握度10-50
      const scores = [10, 20, 30, 40, 50];
      return scores[confidence - 1] || 30;
    }
  },

  submitReview(isCorrect) {
    if (!this.data.currentWord) return;
    
    const masteryScore = this.getMasteryScoreFromConfidence(this.data.confidence, isCorrect);
    const result = isCorrect ? 'know' : 'dont_know';
    
    wx.request({
      url: `${app.globalData.apiUrl}/words/progress`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        wordId: this.data.currentWord.id,
        result: result,
        masteryScore: masteryScore
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ 
            reviewedCount: this.data.reviewedCount + 1,
            showAnswer: false,
            confidence: 3 // 重置自信度
          });
          // 加载下一个复习单词
          setTimeout(() => {
            this.loadReviewWord();
          }, 500);
        } else if (res.statusCode === 403) {
          // token无效，重新登录
          wx.showToast({
            title: '请重新登录',
            icon: 'none'
          });
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/index/index'
            });
          }, 1500);
        } else {
          wx.showToast({
            title: '提交失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('提交复习结果失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  handleKnow() {
    this.submitReview(true);
  },

  handleDontKnow() {
    this.submitReview(false);
  },

  goBackHome() {
    wx.navigateBack({
      delta: 1
    });
  }
});
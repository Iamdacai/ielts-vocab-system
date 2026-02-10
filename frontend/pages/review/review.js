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
    this.loadReviewWord();
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

  submitReview(isCorrect) {
    if (!this.data.currentWord) return;
    
    wx.request({
      url: `${app.globalData.apiUrl}/words/progress`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        wordId: this.data.currentWord.id,
        isCorrect: isCorrect,
        confidence: this.data.confidence,
        actionType: 'review'
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
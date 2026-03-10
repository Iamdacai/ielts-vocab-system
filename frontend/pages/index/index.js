// pages/index/index.js - 优化版：九宫格可视化
const app = getApp();
import { 
  countWordsByStage, 
  getDueWords, 
  calculateMasteryRate,
  calculateArcPath,
  getSectorCenter,
  REVIEW_STAGES
} from '../../utils/memoryWheel';

Page({
  data: {
    hasLogin: false,
    userInfo: null,
    stats: {
      total_words: 0,
      mastered_words: 0,
      learning_words: 0,
      avg_mastery_score: 0
    },
    todayStats: {
      newWords: 0,
      reviewWords: 0,
      masteredWords: 0
    },
    memoryWheelData: [],
    dueWordsCount: 0,
    masteryRate: 0,
    loading: true
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    if (this.data.hasLogin) {
      this.loadStats();
    }
  },

  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
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
          app.globalData.token = token;
          app.globalData.userInfo = userInfo;
          app.globalData.hasLogin = true;
          this.setData({ 
            hasLogin: true,
            userInfo: userInfo
          });
          this.loadStats();
          return;
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
    this.setData({ 
      hasLogin: false,
      loading: false
    });
  },

  async loadStats() {
    try {
      // 加载统计数据
      const statsRes = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.apiUrl}/stats`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${app.globalData.token}`
          },
          success: resolve,
          fail: reject
        });
      });

      if (statsRes.statusCode === 200) {
        const stats = statsRes.data;
        
        // 加载单词数据用于九宫格
        const wordsRes = await new Promise((resolve, reject) => {
          wx.request({
            url: `${app.globalData.apiUrl}/words/all`,
            method: 'GET',
            header: {
              'Authorization': `Bearer ${app.globalData.token}`
            },
            success: resolve,
            fail: reject
          });
        });

        let wheelData = [];
        let dueCount = 0;
        let masteryRate = 0;

        if (wordsRes.statusCode === 200) {
          const words = wordsRes.data;
          
          // 计算九宫格数据
          const stageCounts = countWordsByStage(words);
          wheelData = stageCounts.map((stage, index) => {
            const path = calculateArcPath(index, 8, 100);
            const center = getSectorCenter(index, 8, 100, 40);
            const labelCenter = getSectorCenter(index, 8, 100, 70);
            
            return {
              id: stage.id,
              path,
              color: stage.color,
              count: stage.count,
              label: stage.label,
              centerX: center.x,
              centerY: center.y,
              labelX: labelCenter.x,
              labelY: labelCenter.y,
            };
          });

          // 计算待复习数量
          const dueWords = getDueWords(words);
          dueCount = dueWords.length;

          // 计算掌握率
          masteryRate = calculateMasteryRate(words);
        }

        this.setData({
          stats,
          memoryWheelData: wheelData,
          dueWordsCount: dueCount,
          masteryRate,
          loading: false
        });
      } else {
        this.setData({ loading: false });
        if (statsRes.statusCode === 403) {
          this.checkLoginStatus();
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      this.setData({ loading: false });
    }
  },

  handleLogin() {
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          wx.request({
            url: `${app.globalData.apiUrl}/auth/login`,
            method: 'POST',
            data: { code: loginRes.code },
            success: (res) => {
              if (res.statusCode === 200 && res.data.token) {
                app.globalData.token = res.data.token;
                app.globalData.userInfo = res.data.user;
                app.globalData.hasLogin = true;
                
                wx.setStorageSync('token', res.data.token);
                wx.setStorageSync('userInfo', res.data.user);
                
                this.setData({
                  hasLogin: true,
                  userInfo: res.data.user
                });
                
                this.loadStats();
              } else {
                wx.showToast({
                  title: '登录失败',
                  icon: 'error'
                });
              }
            },
            fail: (err) => {
              console.error('登录请求失败:', err);
              wx.showToast({
                title: '网络错误',
                icon: 'error'
              });
            }
          });
        } else {
          wx.showToast({
            title: '获取登录码失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('微信登录失败:', err);
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        });
      }
    });
  },

  startReview() {
    if (this.data.dueWordsCount > 0) {
      wx.navigateTo({
        url: '/pages/review/review'
      });
    } else {
      wx.showToast({
        title: '太棒了！没有待复习的单词',
        icon: 'success'
      });
    }
  },

  navigateToLearning() {
    if (!this.data.hasLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/learning/learning' });
  },

  navigateToReview() {
    if (!this.data.hasLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (this.data.dueWordsCount > 0) {
      wx.navigateTo({ url: '/pages/review/review' });
    } else {
      wx.showToast({ title: '没有待复习的单词', icon: 'none' });
    }
  },

  navigateToConfig() {
    if (!this.data.hasLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/config/config' });
  }
});

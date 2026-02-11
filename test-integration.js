const express = require('express');
const path = require('path');

// 创建一个简单的测试服务器来模拟小程序请求
const app = express();
app.use(express.json());

// 模拟后端API
let mockUsers = [];
let mockConfigs = [];
let mockWords = [];

// 模拟登录
app.post('/api/auth/login', (req, res) => {
  const userId = mockUsers.length + 1;
  const user = { id: userId, openid: `mock_openid_${Date.now()}` };
  mockUsers.push(user);
  
  mockConfigs.push({
    user_id: userId,
    weekly_new_words_days: [1,2,3,4,5,6,7],
    daily_new_words_count: 20,
    review_time: '20:00'
  });
  
  res.json({
    token: `mock_token_${userId}`,
    user: user
  });
});

// 模拟获取配置
app.get('/api/config', (req, res) => {
  const config = mockConfigs[0] || {
    weekly_new_words_days: [1,2,3,4,5,6,7],
    daily_new_words_count: 20,
    review_time: '20:00'
  };
  res.json(config);
});

// 模拟更新配置
app.post('/api/config', (req, res) => {
  if (mockConfigs.length > 0) {
    mockConfigs[0] = { ...mockConfigs[0], ...req.body };
  }
  res.json(mockConfigs[0] || req.body);
});

// 模拟获取新词
app.get('/api/words/new', (req, res) => {
  const sampleWords = [
    {
      id: 1,
      word: "ubiquitous",
      phonetic: "/juːˈbɪkwɪtəs/",
      part_of_speech: "adj.",
      definition: "无所不在的，普遍存在的",
      example_sentences: ["Mobile phones are now ubiquitous in modern society."],
      frequency_level: "high",
      cambridge_book: 10
    },
    {
      id: 2,
      word: "meticulous",
      phonetic: "/məˈtɪkjələs/",
      part_of_speech: "adj.",
      definition: "一丝不苟的，非常仔细的",
      example_sentences: ["She is meticulous in her research methodology."],
      frequency_level: "medium",
      cambridge_book: 12
    }
  ];
  res.json(sampleWords);
});

// 模拟获取复习词
app.get('/api/words/review', (req, res) => {
  const sampleReviewWords = [
    {
      id: 3,
      word: "paradigm",
      phonetic: "/ˈpærədaɪm/",
      part_of_speech: "n.",
      definition: "范例，典范",
      example_sentences: ["This discovery represents a paradigm shift in physics."],
      frequency_level: "high",
      cambridge_book: 8,
      status: "learning",
      mastery_score: 65.5,
      review_count: 2
    }
  ];
  res.json(sampleReviewWords);
});

// 模拟记录进度
app.post('/api/words/progress', (req, res) => {
  res.json({ 
    success: true, 
    mastery: 75.5, 
    nextReviewAt: new Date(Date.now() + 86400000),
    status: "learning"
  });
});

// 模拟统计
app.get('/api/stats', (req, res) => {
  res.json({
    total_words: 25,
    mastered_words: 8,
    learning_words: 15,
    forgotten_words: 2,
    avg_mastery_score: 68.5,
    today_learning_count: 12,
    weekly_trend: [
      { date: "2026-02-04", count: 8 },
      { date: "2026-02-05", count: 10 },
      { date: "2026-02-06", count: 15 },
      { date: "2026-02-07", count: 12 },
      { date: "2026-02-08", count: 18 },
      { date: "2026-02-09", count: 20 },
      { date: "2026-02-10", count: 12 }
    ]
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`集成测试服务器启动成功！端口: ${PORT}`);
  console.log('现在可以测试完整的前端到后端流程了！');
});
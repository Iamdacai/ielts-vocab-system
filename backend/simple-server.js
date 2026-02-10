const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// 模拟数据
let mockWords = [];
let userProgress = {};

try {
  mockWords = JSON.parse(fs.readFileSync('./backend/seed-data/ielts-words-sample.json', 'utf8'));
  console.log(`加载了 ${mockWords.length} 个模拟单词`);
} catch (error) {
  console.log('使用内置模拟数据');
  mockWords = [
    {
      id: 1,
      word: "abandon",
      phonetic: "/əˈbændən/",
      part_of_speech: "v.",
      definition: "放弃，抛弃",
      example_sentences: ["The sailors had to abandon the ship.", "She abandoned her career to raise children."],
      frequency_level: "high",
      cambridge_book: 10
    },
    {
      id: 2,
      word: "benefit",
      phonetic: "/ˈbenɪfɪt/",
      part_of_speech: "n./v.",
      definition: "利益，好处；受益",
      example_sentences: ["Regular exercise has many health benefits.", "The new policy will benefit all employees."],
      frequency_level: "high",
      cambridge_book: 8
    }
  ];
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'ielts-vocab-mock-backend' });
});

// 模拟登录
app.post('/api/auth/login', (req, res) => {
  res.json({
    token: 'mock_token_123',
    user: { id: 1, openid: 'mock_openid' }
  });
});

// 获取新词
app.get('/api/words/new', (req, res) => {
  const newWords = mockWords.slice(0, 5);
  res.json(newWords);
});

// 获取复习词
app.get('/api/words/review', (req, res) => {
  const reviewWords = mockWords.slice(0, 3);
  res.json(reviewWords);
});

// 记录进度
app.post('/api/words/progress', (req, res) => {
  console.log('记录学习进度:', req.body);
  res.json({ success: true, mastery: 85, nextReviewAt: new Date(Date.now() + 86400000) });
});

// 获取配置
app.get('/api/config', (req, res) => {
  res.json({
    weekly_new_words_days: [1,2,3,4,5,6,7],
    daily_new_words_count: 20,
    review_time: '20:00'
  });
});

// 更新配置
app.post('/api/config', (req, res) => {
  console.log('更新配置:', req.body);
  res.json(req.body);
});

// 获取统计
app.get('/api/stats', (req, res) => {
  res.json({
    total_words: 150,
    mastered_words: 45,
    learning_words: 105,
    avg_mastery_score: 68.5,
    today_learning_count: 12
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`雅思背单词模拟后端服务启动成功！端口: ${PORT}`);
  console.log('注意：这是模拟服务，仅用于前端测试');
});

module.exports = app;
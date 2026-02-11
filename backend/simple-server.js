const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

const app = express();

// 安全中间件
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8080', 'https://your-wechat-appid.wx.qcloud.la'],
  credentials: true
}));

// 解析JSON
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ielts-vocab-backend',
    database: 'in-memory'
  });
});

// 简化的认证（开发用）
app.post('/api/auth/login', (req, res) => {
  const token = jwt.sign(
    { userId: 1, openid: 'test_user' },
    'dev_secret',
    { expiresIn: '24h' }
  );
  
  res.json({
    token,
    user: { id: 1, openid: 'test_user' }
  });
});

// 简化的配置
app.get('/api/config', (req, res) => {
  res.json({
    weekly_new_words_days: [1,2,3,4,5,6,7],
    daily_new_words_count: 20,
    review_time: '20:00'
  });
});

app.post('/api/config', (req, res) => {
  res.json(req.body);
});

// 简化的单词数据
const sampleWords = [
  {
    id: 1,
    word: "abandon",
    phonetic: "/əˈbændən/",
    part_of_speech: "v.",
    definition: "放弃，抛弃",
    example_sentences: ["The baby was abandoned by its mother.", "He abandoned his car on the side of the road."],
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

app.get('/api/words/new', (req, res) => {
  res.json(sampleWords);
});

app.get('/api/words/review', (req, res) => {
  res.json(sampleWords);
});

app.post('/api/words/progress', (req, res) => {
  res.json({ success: true, mastery: 85, nextReviewAt: new Date(Date.now() + 86400000) });
});

app.get('/api/stats', (req, res) => {
  res.json({
    total_words: 2,
    mastered_words: 1,
    learning_words: 1,
    avg_mastery_score: 85,
    today_learning_count: 2
  });
});

// 使用端口3001避免冲突
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`雅思背单词简化后端服务启动成功！端口: ${PORT}`);
  console.log('注意：这是简化版本，仅用于前端测试和演示');
});

module.exports = app;
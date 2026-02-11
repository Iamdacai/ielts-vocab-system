const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ielts-vocab-backend',
    database: 'sqlite'
  });
});

// 简化的登录接口
app.post('/api/auth/login', (req, res) => {
  res.json({
    token: 'mock_token_for_testing',
    user: { id: 1, openid: 'test_openid' }
  });
});

// 简化的配置接口
app.get('/api/config', (req, res) => {
  res.json({
    weekly_new_words_days: [1,2,3,4,5,6,7],
    daily_new_words_count: 20,
    review_time: '20:00'
  });
});

// 简化的新词接口
app.get('/api/words/new', (req, res) => {
  res.json([
    {
      id: 1,
      word: 'example',
      phonetic: '/ɪɡˈzæmpəl/',
      part_of_speech: 'n.',
      definition: '例子，示例',
      example_sentences: ['This is an example of good writing.'],
      frequency_level: 'high',
      cambridge_book: 10
    }
  ]);
});

// 简化的复习接口
app.get('/api/words/review', (req, res) => {
  res.json([]);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ 雅思背单词后端服务启动成功！端口: ${PORT}`);
  console.log(`环境: development`);
  console.log(`数据库: SQLite (模拟)`);
});
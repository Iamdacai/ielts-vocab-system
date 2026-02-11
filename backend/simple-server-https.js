const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');
const path = require('path');

// 初始化数据库
const { initializeDatabase } = require('./database');

const app = express();

// 安全中间件
app.use(helmet({
  // 允许微信小程序域名
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://your-wechat-appid.wx.qcloud.la", "https://localhost:3001"]
    }
  }
}));

app.use(cors({
  origin: [
    'http://localhost:8080', 
    'https://your-wechat-appid.wx.qcloud.la',
    'https://localhost:3001'
  ],
  credentials: true
}));

// 解析JSON
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/health', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const result = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'ielts-vocab-backend-https',
      database: 'sqlite',
      total_words: result.count
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'ielts-vocab-backend-https',
      database: 'sqlite-error',
      error: error.message
    });
  }
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

// 获取真实新词
app.get('/api/words/new', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const words = await db.all('SELECT * FROM ielts_words ORDER BY RANDOM() LIMIT 10');
    
    // 处理example_sentences字段
    const processedWords = words.map(word => ({
      ...word,
      example_sentences: typeof word.example_sentences === 'string' 
        ? (word.example_sentences ? JSON.parse(word.example_sentences) : [])
        : word.example_sentences || []
    }));
    
    res.json(processedWords);
  } catch (error) {
    console.error('获取新词失败:', error);
    res.status(500).json({ error: '获取新词失败' });
  }
});

// 获取真实复习词
app.get('/api/words/review', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const words = await db.all('SELECT * FROM ielts_words ORDER BY RANDOM() LIMIT 10');
    
    const processedWords = words.map(word => ({
      ...word,
      example_sentences: typeof word.example_sentences === 'string' 
        ? (word.example_sentences ? JSON.parse(word.example_sentences) : [])
        : word.example_sentences || []
    }));
    
    res.json(processedWords);
  } catch (error) {
    console.error('获取复习词失败:', error);
    res.status(500).json({ error: '获取复习词失败' });
  }
});

app.post('/api/words/progress', (req, res) => {
  res.json({ success: true, mastery: 85, nextReviewAt: new Date(Date.now() + 86400000) });
});

app.get('/api/stats', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const result = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    res.json({
      total_words: result.count,
      mastered_words: 1,
      learning_words: 1,
      avg_mastery_score: 85,
      today_learning_count: 2
    });
  } catch (error) {
    res.json({
      total_words: 0,
      mastered_words: 0,
      learning_words: 0,
      avg_mastery_score: 0,
      today_learning_count: 0
    });
  }
});

// HTTPS 配置 - 修正路径
const sslPath = path.join(__dirname, '..', 'ssl');
const options = {
  key: fs.readFileSync(path.join(sslPath, 'key.pem')),
  cert: fs.readFileSync(path.join(sslPath, 'cert.pem'))
};

// 使用端口3001
const PORT = process.env.PORT || 3001;
https.createServer(options, app).listen(PORT, () => {
  console.log(`雅思背单词简化HTTPS后端服务启动成功！端口: ${PORT}`);
  console.log('注意：这是简化版本，仅用于前端测试和演示');
  console.log('HTTPS证书路径:', sslPath);
});

module.exports = app;
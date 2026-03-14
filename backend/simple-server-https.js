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

// 🆕 音频文件静态服务（真经词库音频）
app.use('/api/audio/vocabulary', express.static(path.join(__dirname, '../vocabulary/ielts-materials/audio'), {
  setHeaders: (res, path) => {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// 🆕 发音音频静态服务
app.use('/api/pronunciation/word-audio', express.static(path.join(__dirname, '../audio'), {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
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
    
    // 处理 example_sentences 字段（安全解析 JSON）
    const processedWords = words.map(word => {
      let exampleSentences = [];
      if (typeof word.example_sentences === 'string' && word.example_sentences.trim()) {
        try {
          exampleSentences = JSON.parse(word.example_sentences);
        } catch (e) {
          // 如果不是有效 JSON，当作普通字符串处理
          exampleSentences = [word.example_sentences];
        }
      }
      
      return {
        ...word,
        example_sentences: exampleSentences
      };
    });
    
    res.json(processedWords);
  } catch (error) {
    console.error('获取新词失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      error: '获取新词失败',
      message: error.message 
    });
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

// 获取所有单词统计（九宫格用）
app.get('/api/words/all', async (req, res) => {
  try {
    const db = await initializeDatabase();
    
    // 获取所有单词（简化版，返回空数组和统计信息）
    const totalWords = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    
    res.json({
      total_words: totalWords.count || 0,
      learned_words: 0,
      mastered_words: 0,
      learning_words: 0,
      avg_mastery_score: 0,
      words: [] // 简化版返回空数组
    });
  } catch (error) {
    console.error('获取单词统计失败:', error);
    res.json({
      total_words: 0,
      learned_words: 0,
      mastered_words: 0,
      learning_words: 0,
      avg_mastery_score: 0,
      words: []
    });
  }
});

// 🆕 获取词库列表
app.get('/api/words/libraries', async (req, res) => {
  try {
    const db = await initializeDatabase();
    
    // 查询所有词库来源
    const libraries = await db.all(`
      SELECT 
        source,
        COUNT(*) as word_count,
        COUNT(DISTINCT category) as category_count
      FROM ielts_words
      WHERE source IS NOT NULL
      GROUP BY source
      ORDER BY word_count DESC
    `);
    
    // 添加默认词库信息
    const result = [
      {
        id: 'cambridge',
        name: '剑桥雅思 1-18',
        description: '基于剑桥雅思真题 1-18',
        word_count: libraries.find(l => l.source?.includes('剑桥'))?.word_count || 0
      },
      {
        id: 'zhenjing',
        name: '雅思词汇真经',
        description: '刘洪波著，按 22 个场景主题分类',
        word_count: libraries.find(l => l.source?.includes('真经'))?.word_count || 0,
        category_count: libraries.find(l => l.source?.includes('真经'))?.category_count || 0
      }
    ];
    
    res.json(result);
  } catch (error) {
    console.error('获取词库列表失败:', error);
    res.status(500).json({ error: '获取词库列表失败' });
  }
});

// 🆕 获取分类列表（按词库）
app.get('/api/words/categories', async (req, res) => {
  try {
    const { source } = req.query;
    const db = await initializeDatabase();
    
    let query = `
      SELECT 
        category,
        COUNT(*) as word_count,
        MIN(id) as first_word_id
      FROM ielts_words
      WHERE category IS NOT NULL AND category != ''
    `;
    
    let params = [];
    
    if (source) {
      query += ' AND source LIKE ?';
      params.push(`%${source}%`);
    }
    
    query += `
      GROUP BY category
      ORDER BY 
        SUBSTR(category, 1, 2),
        word_count DESC
    `;
    
    const categories = await db.all(query, params);
    
    // 格式化分类名称（去掉编号）
    const result = categories.map(cat => ({
      id: cat.category,
      name: cat.category.replace(/^\d+_/, ''),
      word_count: cat.word_count,
      has_audio: true
    }));
    
    res.json(result);
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const result = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    res.json({
      total_words: result.count,
      mastered_words: 0,
      learning_words: 0,
      avg_mastery_score: 0,
      today_learning_count: 0
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

// 学习会话路由 - 新增
app.post('/api/sessions', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { userId, vocabularySet, mode, plannedDuration } = req.body;
    
    const session = {
      userId: userId || 1,
      vocabularySet: vocabularySet || 'ielts-core',
      mode: mode || 'new',
      startTime: new Date().toISOString(),
      plannedDuration: plannedDuration || 1800
    };
    
    const sessionId = 'session_' + Date.now();
    console.log('创建学习会话:', sessionId, session);
    
    res.json({
      success: true,
      sessionId: sessionId,
      session: session
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康检查 - 兼容 /api/health 路径
app.get('/api/health', async (req, res) => {
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
      status: 'ERROR', 
      error: error.message 
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
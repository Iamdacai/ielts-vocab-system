const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');
const path = require('path');
const multer = require('multer');

// 初始化数据库
const { initializeDatabase } = require('./database');

const app = express();

// 🆕 配置文件上传（发音练习）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// 确保临时目录存在
if (!fs.existsSync('temp')) {
  fs.mkdirSync('temp');
}

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

// 🆕 发音音频动态路由（支持从有道 TTS 获取）
const axios = require('axios');

app.get('/api/pronunciation/word-audio/:word', async (req, res) => {
  const { word } = req.params;
  const cleanWord = decodeURIComponent(word).split(' ')[0].toLowerCase();
  const audioPath = path.join(__dirname, 'audio', `${cleanWord}.mp3`);
  
  // 先检查本地是否有缓存
  if (fs.existsSync(audioPath)) {
    console.log(`[Audio] Cache hit: ${audioPath}`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.sendFile(audioPath);
  }
  
  // 本地没有，从有道 TTS 获取
  console.log(`[Audio] Cache miss, fetching from Youdao: ${cleanWord}`);
  try {
    const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanWord)}&type=2`;
    const response = await axios.get(youdaoUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // 保存到本地缓存
    fs.writeFileSync(audioPath, response.data);
    console.log(`[Audio] Cached: ${audioPath}`);
    
    // 返回音频
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(response.data);
    
  } catch (error) {
    console.error(`[Audio] Fetch failed: ${error.message}`);
    res.status(500).json({ 
      error: 'TTS service unavailable',
      word: cleanWord,
      message: '发音服务暂不可用'
    });
  }
});

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

// 🆕 发音评分 API - 分析用户发音并保存记录
app.post('/api/pronunciation/analyze', upload.single('audio'), async (req, res) => {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio data provided',
        message: 'Please upload an audio file'
      });
    }
    
    const { word } = req.body;
    if (!word || word.length > 50) {
      return res.status(400).json({ error: 'Target word is required' });
    }
    
    const audioPath = req.file.path;
    console.log(`[Pronunciation] Analyzing: "${word}", file: ${audioPath}`);
    
    // 获取音频文件信息
    const stats = fs.statSync(audioPath);
    const fileSize = stats.size;
    
    // 基于文件大小的简单验证（太短或太长都不好）
    // 正常 3-8 秒的录音应该在 50KB-200KB 之间
    let baseScore = 75;
    
    if (fileSize < 30000) {
      // 录音太短
      baseScore = Math.floor(Math.random() * 20) + 50; // 50-70
    } else if (fileSize > 300000) {
      // 录音太长
      baseScore = Math.floor(Math.random() * 20) + 60; // 60-80
    } else {
      // 正常范围，给个较好的分数
      baseScore = Math.floor(Math.random() * 30) + 70; // 70-100
    }
    
    // 添加一些随机性
    const randomFactor = Math.floor(Math.random() * 10) - 5; // -5 to +5
    const finalScore = Math.max(0, Math.min(100, baseScore + randomFactor));
    
    // 生成反馈
    let feedback;
    if (finalScore >= 90) {
      feedback = '发音非常标准！继续保持！🎉';
    } else if (finalScore >= 80) {
      feedback = '发音很好，注意个别音节的重音位置。👍';
    } else if (finalScore >= 70) {
      feedback = '发音基本正确，但某些音素需要改进。💪';
    } else if (finalScore >= 60) {
      feedback = '发音需要更多练习，建议多听标准发音并跟读。📚';
    } else {
      feedback = '继续加油！多听多练会进步的！🔥';
    }
    
    // 🆕 保存到数据库
    const db = await initializeDatabase();
    try {
      // 查找单词 ID
      const wordRecord = await db.get(
        'SELECT id FROM ielts_words WHERE word = ? LIMIT 1',
        [word.split(' ')[0]]
      );
      
      if (wordRecord) {
        // 保存发音记录
        await db.run(
          `INSERT INTO pronunciation_records 
           (user_id, word_id, pronunciation_score, feedback, created_at) 
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [1, wordRecord.id, finalScore, feedback]
        );
        console.log(`[Pronunciation] Record saved for word: ${word}`);
      }
    } catch (dbError) {
      console.error('[Pronunciation] Save record error:', dbError.message);
      // 不阻断主流程，继续返回评分结果
    }
    
    // 清理临时文件
    try {
      fs.unlinkSync(audioPath);
    } catch (e) {
      console.error('清理临时文件失败:', e);
    }
    
    console.log(`[Pronunciation] Analysis complete: ${finalScore}/100`);
    
    res.json({
      score: finalScore,
      accuracy: Math.round(finalScore * 0.95), // 模拟准确度
      fluency: Math.round(finalScore * 0.9),   // 模拟流利度
      feedback: feedback,
      word: word,
      timestamp: new Date().toISOString(),
      isRecorded: true // 标记已保存记录
    });
    
  } catch (error) {
    console.error('[Pronunciation] Analyze error:', error.message);
    res.status(500).json({ 
      error: 'Pronunciation analysis failed',
      message: error.message 
    });
  }
});

// 🆕 获取发音练习历史
app.get('/api/pronunciation/history', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { limit = 20, offset = 0 } = req.query;
    
    // 获取发音历史记录
    const records = await db.all(`
      SELECT 
        p.id,
        p.word_id,
        w.word,
        p.pronunciation_score as score,
        p.feedback,
        p.created_at as timestamp
      FROM pronunciation_records p
      LEFT JOIN ielts_words w ON p.word_id = w.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [1, parseInt(limit), parseInt(offset)]);
    
    // 获取总数
    const totalResult = await db.get(
      'SELECT COUNT(*) as total FROM pronunciation_records WHERE user_id = ?',
      [1]
    );
    
    res.json({
      records: records || [],
      total: totalResult?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('[Pronunciation] Get history error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get pronunciation history',
      message: error.message 
    });
  }
});

// 🆕 获取发音统计
app.get('/api/pronunciation/stats', async (req, res) => {
  try {
    const db = await initializeDatabase();
    
    // 获取统计数据
    const stats = await db.get(`
      SELECT 
        COUNT(*) as totalPractice,
        AVG(pronunciation_score) as averageScore,
        MAX(pronunciation_score) as bestScore,
        COUNT(DISTINCT word_id) as uniqueWords
      FROM pronunciation_records
      WHERE user_id = ?
    `, [1]);
    
    // 获取最近 7 天的练习趋势
    const trend = await db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(pronunciation_score) as avgScore
      FROM pronunciation_records
      WHERE user_id = ?
        AND created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [1]);
    
    // 获取最佳发音单词 Top 5
    const bestWords = await db.all(`
      SELECT 
        w.word,
        MAX(p.pronunciation_score) as bestScore,
        COUNT(*) as practiceCount
      FROM pronunciation_records p
      LEFT JOIN ielts_words w ON p.word_id = w.id
      WHERE p.user_id = ?
      GROUP BY p.word_id
      HAVING practiceCount >= 2
      ORDER BY bestScore DESC, practiceCount DESC
      LIMIT 5
    `, [1]);
    
    res.json({
      totalPractice: stats?.totalPractice || 0,
      averageScore: stats?.averageScore ? Math.round(stats.averageScore) : 0,
      bestScore: stats?.bestScore ? Math.round(stats.bestScore) : 0,
      uniqueWords: stats?.uniqueWords || 0,
      trend: trend || [],
      bestWords: bestWords || []
    });
    
  } catch (error) {
    console.error('[Pronunciation] Get stats error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get pronunciation stats',
      message: error.message 
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
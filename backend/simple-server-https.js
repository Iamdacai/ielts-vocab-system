require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const axios = require('axios');

// 有道智云 API 配置
const YOUDAO_APP_KEY = process.env.YOUDAO_APP_KEY;
const YOUDAO_SECRET_KEY = process.env.YOUDAO_SECRET_KEY;

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

// 🆕 有道词典查询 - 获取完整单词信息
app.get('/api/words/lookup/:word', async (req, res) => {
  try {
    const { word } = req.params;
    const cleanWord = decodeURIComponent(word).trim();
    
    if (!cleanWord) {
      return res.status(400).json({ error: '单词不能为空' });
    }
    
    // 调用有道 API 翻译（英译中）
    const translation = await translateWithYoudao(cleanWord, 'auto', 'zh-CHS');
    
    // 调用有道 API 获取英文释义
    const englishDef = await translateWithYoudao(cleanWord, 'auto', 'en');
    
    // 尝试获取音标（从翻译结果中提取）
    const phonetic = extractPhonetic(translation);
    
    res.json({
      word: cleanWord,
      translation: translation,
      definition: englishDef || cleanWord,
      phonetic: phonetic || '',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('单词查询失败:', error);
    res.status(500).json({ 
      error: '查询失败',
      message: error.message 
    });
  }
});

// 🆕 从翻译结果中提取音标（如果有）
function extractPhonetic(text) {
  if (!text) return null;
  // 匹配音标格式：[xxx] 或 /xxx/
  const match = text.match(/[\[/][^\]\/]+[\]/]/);
  return match ? match[0] : null;
}

// 🆕 批量查询单词信息
app.post('/api/words/lookup/batch', async (req, res) => {
  try {
    const { words } = req.body;
    
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: '单词列表不能为空' });
    }
    
    // 限制每次最多查询 50 个单词
    const limitedWords = words.slice(0, 50);
    
    const results = await Promise.all(
      limitedWords.map(async (word) => {
        try {
          const translation = await translateWithYoudao(word, 'auto', 'zh-CHS');
          const englishDef = await translateWithYoudao(word, 'auto', 'en');
          return {
            word,
            translation,
            definition: englishDef,
            success: true
          };
        } catch (err) {
          return {
            word,
            error: err.message,
            success: false
          };
        }
      })
    );
    
    res.json({
      results,
      total: words.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('批量查询失败:', error);
    res.status(500).json({ 
      error: '批量查询失败',
      message: error.message 
    });
  }
});

// 🆕 有道翻译辅助函数
async function translateWithYoudao(q, from, to) {
  if (!YOUDAO_APP_KEY || !YOUDAO_SECRET_KEY) {
    throw new Error('有道 API 配置缺失');
  }
  
  const salt = crypto.randomUUID();
  const curtime = Math.round(Date.now() / 1000);
  
  // 计算 input（签名用）
  let input = q;
  if (q.length > 20) {
    input = q.substring(0, 10) + q.length + q.substring(q.length - 10);
  }
  
  // 计算签名：sha256(appKey + input + salt + curtime + secretKey)
  const signStr = YOUDAO_APP_KEY + input + salt + curtime + YOUDAO_SECRET_KEY;
  const sign = crypto.createHash('sha256').update(signStr).digest('hex');
  
  // 构建请求参数
  const params = new URLSearchParams({
    q,
    from,
    to,
    appKey: YOUDAO_APP_KEY,
    salt,
    sign,
    signType: 'v3',
    curtime: curtime.toString()
  });
  
  // 发送请求
  const response = await axios.get('https://openapi.youdao.com/api', {
    params,
    timeout: 10000
  });
  
  const data = response.data;
  
  // 检查错误码
  if (data.errorCode !== '0') {
    throw new Error(`有道 API 错误：${data.errorCode}`);
  }
  
  // 返回翻译结果
  return Array.isArray(data.translation) ? data.translation.join('\n') : data.translation;
}

// 🆕 补充单词信息（按需调用有道 API）
async function enrichWordWithYoudao(word) {
  try {
    // 如果已有中文翻译，直接返回
    if (word.translation_cn && word.translation_cn.trim()) {
      return word;
    }
    
    // 调用有道 API 获取中文翻译
    const translation = await translateWithYoudao(word.word, 'auto', 'zh-CHS');
    
    // 提取音标（如果有）
    const phonetic = extractPhonetic(translation);
    
    // 清理翻译文本（去除音标）
    const cleanTranslation = translation.replace(/[\[/][^\]\/]+[\]/]/g, '').trim();
    
    return {
      ...word,
      translation_cn: cleanTranslation,
      phonetic: word.phonetic || phonetic || '',
      _fromYoudao: true  // 标记来自有道 API
    };
  } catch (error) {
    console.log(`[有道 API] 查询单词 "${word.word}" 失败:`, error.message);
    // API 失败时返回原数据，不影响使用
    return word;
  }
}

// 获取真实新词
app.get('/api/words/new', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const words = await db.all('SELECT * FROM ielts_words ORDER BY RANDOM() LIMIT 10');
    
    // 处理字段映射和 example_sentences（安全解析 JSON）
    let processedWords = words.map(word => {
      let exampleSentences = [];
      if (typeof word.example_sentences === 'string' && word.example_sentences.trim()) {
        try {
          exampleSentences = JSON.parse(word.example_sentences);
        } catch (e) {
          // 如果不是有效 JSON，当作普通字符串处理
          exampleSentences = [word.example_sentences];
        }
      }
      
      // 🆕 字段映射：数据库字段 → 前端期望字段
      const definition = word.definition || '';
      
      return {
        ...word,
        // 核心字段映射
        translation: definition,
        translation_cn: '',  // 预留中文翻译字段（将由有道 API 补充）
        pos: word.part_of_speech || '',
        examples: exampleSentences,
        example: Array.isArray(exampleSentences) && exampleSentences.length > 0 ? exampleSentences[0] : '',
        example_translation: '',
        synonyms: [],
        antonyms: [],
        example_sentences: exampleSentences
      };
    });
    
    // 🆕 按需调用有道 API 补充中文翻译（异步并行处理）
    processedWords = await Promise.all(
      processedWords.map(word => enrichWordWithYoudao(word))
    );
    
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
    
    let processedWords = words.map(word => {
      let exampleSentences = [];
      
      // 安全解析 example_sentences 字段
      if (typeof word.example_sentences === 'string' && word.example_sentences.trim()) {
        try {
          exampleSentences = JSON.parse(word.example_sentences);
        } catch (e) {
          // 如果不是有效 JSON，当作普通字符串处理
          exampleSentences = [word.example_sentences];
        }
      } else if (Array.isArray(word.example_sentences)) {
        exampleSentences = word.example_sentences;
      }
      
      // 🆕 字段映射：数据库字段 → 前端期望字段
      return {
        ...word,
        // 核心字段映射
        translation: word.definition || '',
        translation_cn: '',  // 预留中文翻译字段（将由有道 API 补充）
        pos: word.part_of_speech || '',
        examples: exampleSentences,
        example: Array.isArray(exampleSentences) && exampleSentences.length > 0 ? exampleSentences[0] : '',
        example_translation: '',
        synonyms: [],
        antonyms: [],
        example_sentences: exampleSentences
      };
    });
    
    // 🆕 按需调用有道 API 补充中文翻译（异步并行处理）
    processedWords = await Promise.all(
      processedWords.map(word => enrichWordWithYoudao(word))
    );
    
    res.json(processedWords);
  } catch (error) {
    console.error('获取复习词失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      error: '获取复习词失败',
      message: error.message 
    });
  }
});

// 🆕 保存单词学习进度
app.post('/api/words/progress', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { wordId, result, masteryScore, stage, nextReviewDate } = req.body;
    
    if (!wordId) {
      return res.status(400).json({ error: 'wordId is required' });
    }
    
    const userId = 1; // 默认用户 ID
    const now = new Date().toISOString();
    
    // 计算掌握分数
    let score = masteryScore || 0;
    if (result === 'know' || result === 'known') {
      score = Math.max(score, 75);
    } else if (result === 'hard') {
      score = Math.max(score, 50);
    } else if (result === 'forgot' || result === 'unknown') {
      score = Math.min(score, 25);
    }
    
    // 检查是否已有记录
    const existing = await db.get(
      'SELECT * FROM user_word_progress WHERE user_id = ? AND word_id = ?',
      [userId, wordId]
    );
    
    if (existing) {
      // 更新现有记录
      await db.run(`
        UPDATE user_word_progress 
        SET mastery_score = ?, 
            status = ?,
            review_count = review_count + 1,
            next_review_at = ?,
            updated_at = ?
        WHERE user_id = ? AND word_id = ?
      `, [score, result === 'known' || result === 'know' ? 'learning' : 'new', nextReviewDate || now, now, userId, wordId]);
    } else {
      // 插入新记录
      await db.run(`
        INSERT INTO user_word_progress (user_id, word_id, status, mastery_score, next_review_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, wordId, 'learning', score, nextReviewDate || now, now, now]);
    }
    
    // 🆕 记录学习行为到 learning_records 表（action_type 必须是：new_word, review, test, mastered）
    const actionType = stage !== undefined ? 'review' : 'new_word';
    await db.run(`
      INSERT INTO learning_records (user_id, word_id, action_type, result, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, wordId, actionType, result, now]);
    
    console.log(`[Progress] Saved: wordId=${wordId}, result=${result}, score=${score}`);
    
    res.json({ 
      success: true, 
      mastery: score, 
      nextReviewAt: nextReviewDate || now 
    });
  } catch (error) {
    console.error('保存学习进度失败:', error);
    res.status(500).json({ 
      error: '保存学习进度失败',
      message: error.message 
    });
  }
});

// 🆕 复习课管理 API

// 🆕 复习页面 Dashboard 接口（九宫格 + 今日复习课）
app.get('/api/review/dashboard', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const userId = 1; // 默认用户 ID
    
    // 1. 获取所有单词的进度数据
    const words = await db.all(`
      SELECT 
        w.id,
        w.word,
        w.phonetic,
        w.part_of_speech,
        w.definition,
        w.example_sentences,
        p.stage,
        p.next_review_at,
        p.mastery_score
      FROM ielts_words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id AND p.user_id = ?
      WHERE p.user_id = ? OR p.user_id IS NULL
    `, [userId, userId]);
    
    // 2. 计算九宫格数据（8 个阶段）
    const REVIEW_STAGES = [
      { id: 0, label: '新学', days: 0, color: '#ef4444' },
      { id: 1, label: '第 1 天', days: 1, color: '#f59e0b' },
      { id: 2, label: '第 2 天', days: 2, color: '#f59e0b' },
      { id: 3, label: '第 4 天', days: 4, color: '#f59e0b' },
      { id: 4, label: '第 7 天', days: 7, color: '#f59e0b' },
      { id: 5, label: '第 15 天', days: 15, color: '#22c55e' },
      { id: 6, label: '第 21 天', days: 21, color: '#22c55e' },
      { id: 7, label: '已掌握', days: 30, color: '#22c55e' },
    ];
    
    const wheelData = REVIEW_STAGES.map(stage => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      count: words.filter(w => (w.stage || 0) === stage.id).length
    }));
    
    // 3. 获取今日复习课
    const today = new Date().toISOString().split('T')[0];
    const session = await db.get(`
      SELECT * FROM review_sessions
      WHERE user_id = ? AND session_date = ?
    `, [userId, today]);
    
    // 4. 计算待复习单词数（今天需要复习的）
    const todayStats = await db.get(`
      SELECT COUNT(*) as count FROM user_word_progress
      WHERE user_id = ? 
        AND next_review_at <= datetime('now', 'start of day')
        AND mastery_score < 75
    `, [userId]);
    
    const dueWordsCount = todayStats ? todayStats.count : 0;
    
    // 5. 计算统计数据
    const totalWords = words.length;
    const masteredWords = words.filter(w => (w.stage || 0) >= 5).length;
    const masteryRate = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;
    
    // 6. 构建今日复习课信息
    let todaySession = {
      hasSession: false,
      plannedWords: 0,
      completedWords: 0,
      status: 'none',
      estimatedMinutes: 0
    };
    
    if (session) {
      todaySession = {
        hasSession: true,
        plannedWords: session.planned_words || 0,
        completedWords: session.completed_words || 0,
        status: session.status || 'pending',
        estimatedMinutes: Math.ceil((session.planned_words - session.completed_words) * 20 / 60) // 每个单词 20 秒
      };
    } else if (dueWordsCount > 0) {
      todaySession = {
        hasSession: true,
        plannedWords: dueWordsCount,
        completedWords: 0,
        status: 'pending',
        estimatedMinutes: Math.ceil(dueWordsCount * 20 / 60)
      };
    }
    
    res.json({
      wheelData,
      todaySession,
      stats: {
        totalWords,
        masteredWords,
        masteryRate
      }
    });
    
  } catch (error) {
    console.error('获取复习页面数据失败:', error);
    res.status(500).json({ 
      error: '获取复习页面数据失败',
      message: error.message 
    });
  }
});

// 获取今日复习课
app.get('/api/review/sessions/today', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const userId = 1; // 默认用户 ID
    const today = new Date().toISOString().split('T')[0];
    
    // 查询今日复习课
    let session = await db.get(`
      SELECT * FROM review_sessions
      WHERE user_id = ? AND session_date = ?
    `, [userId, today]);
    
    // 如果今天没有复习课，创建一个新的
    if (!session) {
      // 查询待复习单词数
      const dueWords = await db.get(`
        SELECT COUNT(*) as count FROM user_word_progress
        WHERE user_id = ? AND next_review_at <= datetime('now') AND mastery_score < 75
      `, [userId]);
      
      if (dueWords.count === 0) {
        return res.json({
          hasSession: false,
          message: '今天没有待复习的单词',
          plannedWords: 0
        });
      }
      
      // 创建复习课
      const result = await db.run(`
        INSERT INTO review_sessions (user_id, session_date, planned_words, status, started_at)
        VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      `, [userId, today, dueWords.count]);
      
      const sessionId = result.lastID;
      
      // 插入复习课详情
      await db.run(`
        INSERT INTO review_session_items (session_id, word_id, status)
        SELECT ?, word_id, 'pending'
        FROM user_word_progress
        WHERE user_id = ? AND next_review_at <= datetime('now') AND mastery_score < 75
      `, [sessionId, userId]);
      
      session = await db.get(`SELECT * FROM review_sessions WHERE id = ?`, [sessionId]);
    }
    
    // 查询复习课详情（包含单词信息）
    const items = await db.all(`
      SELECT 
        rsi.id as item_id,
        rsi.status as item_status,
        rsi.result,
        rsi.answered_at,
        iw.id,
        iw.word,
        iw.phonetic,
        iw.part_of_speech,
        iw.definition,
        iw.example_sentences,
        uwp.mastery_score,
        uwp.stage,
        uwp.next_review_at,
        uwp.review_count
      FROM review_session_items rsi
      JOIN ielts_words iw ON rsi.word_id = iw.id
      LEFT JOIN user_word_progress uwp ON uwp.user_id = ? AND uwp.word_id = iw.id
      WHERE rsi.session_id = ?
      ORDER BY 
        CASE rsi.status 
          WHEN 'pending' THEN 0 
          WHEN 'wrong' THEN 1 
          WHEN 'correct' THEN 2 
        END,
        RANDOM()
    `, [userId, session.id]);
    
    // 处理例句 JSON
    const words = items.map(item => {
      let examples = [];
      if (typeof item.example_sentences === 'string' && item.example_sentences.trim()) {
        try {
          examples = JSON.parse(item.example_sentences);
        } catch (e) {
          examples = [item.example_sentences];
        }
      }
      
      return {
        ...item,
        example_sentences: examples,
        example: examples.length > 0 ? examples[0] : '',
        sessionItemId: item.item_id
      };
    });
    
    res.json({
      hasSession: true,
      session: {
        id: session.id,
        sessionDate: session.session_date,
        plannedWords: session.planned_words,
        completedWords: session.completed_words,
        status: session.status,
        startedAt: session.started_at
      },
      words
    });
  } catch (error) {
    console.error('获取今日复习课失败:', error);
    res.status(500).json({ 
      error: '获取复习课失败',
      message: error.message 
    });
  }
});

// 提交复习课答案
app.post('/api/review/sessions/:sessionId/answer', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { sessionId } = req.params;
    const { wordId, result, stage } = req.body;
    
    if (!sessionId || !wordId || !result) {
      return res.status(400).json({ error: '缺少必填参数' });
    }
    
    const userId = 1;
    const now = new Date().toISOString();
    
    // 计算下次复习时间（基于阶段）
    const REVIEW_STAGES = [0, 1, 2, 4, 7, 15, 21, 30];
    const daysToAdd = REVIEW_STAGES[stage] || 0;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
    
    // 计算掌握分数
    const masteryScore = result === 'known' ? 75 : 25;
    
    // 1. 更新复习课详情
    await db.run(`
      UPDATE review_session_items
      SET status = ?, result = ?, answered_at = ?
      WHERE session_id = ? AND word_id = ?
    `, [result === 'known' ? 'correct' : 'wrong', result, now, sessionId, wordId]);
    
    // 2. 更新用户单词进度
    await db.run(`
      INSERT OR REPLACE INTO user_word_progress 
      (user_id, word_id, status, mastery_score, stage, next_review_at, review_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 
        COALESCE((SELECT review_count FROM user_word_progress WHERE user_id = ? AND word_id = ?), 0) + 1,
        ?)
    `, [userId, wordId, 'learning', masteryScore, stage, nextReviewDate.toISOString(), userId, wordId, now]);
    
    // 3. 更新复习课完成数
    await db.run(`
      UPDATE review_sessions
      SET completed_words = (
        SELECT COUNT(*) FROM review_session_items 
        WHERE session_id = ? AND status = 'correct'
      ),
      status = CASE 
        WHEN completed_words + 1 >= planned_words THEN 'completed'
        ELSE status
      END,
      completed_at = CASE 
        WHEN completed_words + 1 >= planned_words THEN ?
        ELSE completed_at
      END
      WHERE id = ?
    `, [sessionId, now, sessionId]);
    
    // 4. 记录学习行为
    await db.run(`
      INSERT INTO learning_records (user_id, word_id, action_type, result, created_at)
      VALUES (?, ?, 'review', ?, ?)
    `, [userId, wordId, result, now]);
    
    // 返回复习课最新状态
    const session = await db.get(`
      SELECT * FROM review_sessions WHERE id = ?
    `, [sessionId]);
    
    res.json({
      success: true,
      session: {
        completedWords: session.completed_words,
        plannedWords: session.planned_words,
        status: session.status,
        isComplete: session.status === 'completed'
      }
    });
  } catch (error) {
    console.error('提交答案失败:', error);
    res.status(500).json({ 
      error: '提交答案失败',
      message: error.message 
    });
  }
});

// 获取复习课历史
app.get('/api/review/sessions/history', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const userId = 1;
    const { days = 7 } = req.query;
    
    const sessions = await db.all(`
      SELECT 
        session_date,
        planned_words,
        completed_words,
        status,
        started_at,
        completed_at,
        ROUND(completed_words * 100.0 / planned_words, 2) as completion_rate
      FROM review_sessions
      WHERE user_id = ? AND session_date >= date('now', ? || ' days')
      ORDER BY session_date DESC
    `, [userId, -parseInt(days)]);
    
    res.json({ sessions });
  } catch (error) {
    console.error('获取复习课历史失败:', error);
    res.status(500).json({ 
      error: '获取历史失败',
      message: error.message 
    });
  }
});

// 获取复习课统计
app.get('/api/review/sessions/stats', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const userId = 1;
    
    // 总复习课数
    const totalStats = await db.get(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(planned_words) as total_words,
        SUM(completed_words) as completed_words,
        AVG(completion_rate) as avg_completion_rate
      FROM (
        SELECT 
          *,
          ROUND(completed_words * 100.0 / planned_words, 2) as completion_rate
        FROM review_sessions
        WHERE user_id = ? AND status = 'completed'
      )
    `, [userId]);
    
    // 连续复习天数
    const streakStats = await db.get(`
      SELECT COUNT(DISTINCT session_date) as streak_days
      FROM review_sessions
      WHERE user_id = ? AND status = 'completed'
        AND session_date >= date('now', '-7 days')
    `, [userId]);
    
    res.json({
      totalSessions: totalStats.total_sessions || 0,
      totalWords: totalStats.total_words || 0,
      completedWords: totalStats.completed_words || 0,
      avgCompletionRate: totalStats.avg_completion_rate || 0,
      weekStreak: streakStats.streak_days || 0
    });
  } catch (error) {
    console.error('获取复习课统计失败:', error);
    res.status(500).json({ 
      error: '获取统计失败',
      message: error.message 
    });
  }
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

// 🆕 获取统计数据（首页用）
app.get('/api/stats', async (req, res) => {
  try {
    const db = await initializeDatabase();
    
    // 获取总单词数
    const totalResult = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    const total_words = totalResult.count || 0;
    
    // 获取今日日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    today.setDate(today.getDate() + 1);
    const todayEnd = today.toISOString();
    
    // 统计今日新学单词数（从 learning_records 表）
    const todayNewResult = await db.get(`
      SELECT COUNT(DISTINCT word_id) as count 
      FROM learning_records 
      WHERE action_type = 'new' 
      AND created_at >= ? AND created_at < ?
    `, [todayStart, todayEnd]);
    const today_new_words = todayNewResult?.count || 0;
    
    // 统计今日复习单词数
    const todayReviewResult = await db.get(`
      SELECT COUNT(DISTINCT word_id) as count 
      FROM learning_records 
      WHERE action_type = 'review' 
      AND created_at >= ? AND created_at < ?
    `, [todayStart, todayEnd]);
    const today_review_words = todayReviewResult?.count || 0;
    
    // 统计已掌握单词数（mastery_score >= 75）
    const masteredResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM user_word_progress 
      WHERE mastery_score >= 75
    `);
    const mastered_words = masteredResult?.count || 0;
    
    // 统计学习中单词数（mastery_score < 75 且有记录）
    const learningResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM user_word_progress 
      WHERE mastery_score < 75 AND mastery_score > 0
    `);
    const learning_words = learningResult?.count || 0;
    
    // 计算平均掌握率
    const avgResult = await db.get(`
      SELECT AVG(mastery_score) as avg_score 
      FROM user_word_progress 
      WHERE mastery_score > 0
    `);
    const avg_mastery_score = avgResult?.avg_score ? Math.round(avgResult.avg_score) : 0;
    
    // 计算掌握率百分比
    const masteryRate = total_words > 0 ? Math.round((mastered_words / total_words) * 100) : 0;
    
    // 🆕 计算待复习单词数（user_word_progress 表中 next_review_at <= 现在 且 mastery_score < 75）
    const now = new Date().toISOString();
    const dueResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM user_word_progress 
      WHERE next_review_at <= ? AND mastery_score < 75
    `, [now]);
    const due_words_count = dueResult?.count || 0;
    
    res.json({
      total_words,
      mastered_words,
      learning_words,
      avg_mastery_score,
      today_new_words,
      today_review_words,
      due_words_count,  // 🆕 待复习单词数
      mastery_rate: masteryRate,
      today_learning_count: today_new_words + today_review_words
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.json({
      total_words: 0,
      mastered_words: 0,
      learning_words: 0,
      avg_mastery_score: 0,
      today_new_words: 0,
      today_review_words: 0,
      mastery_rate: 0,
      today_learning_count: 0
    });
  }
});

// 🆕 保存学习会话
app.post('/api/sessions', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { duration, newWords, reviewedWords, masteredWords, confirmedDuration } = req.body;
    
    const userId = 1; // 默认用户 ID
    const now = new Date().toISOString();
    
    // 🆕 插入会话摘要记录（action_type 使用 'review' 作为通用类型）
    // 注意：learning_records 表的 action_type 只能是：new_word, review, test, mastered
    const sessionData = `duration:${duration||0},new:${newWords||0},review:${reviewedWords||0},mastered:${masteredWords||0}`;
    await db.run(`
      INSERT INTO learning_records (user_id, word_id, action_type, result, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, 0, 'review', sessionData, now]);
    
    console.log(`[Session] Saved: duration=${duration}s, new=${newWords}, review=${reviewedWords}, mastered=${masteredWords}`);
    
    res.json({
      success: true,
      sessionId: 'session_' + Date.now(),
      message: '学习会话已保存'
    });
  } catch (error) {
    console.error('保存学习会话失败:', error);
    res.status(500).json({
      success: false,
      error: '保存学习会话失败',
      message: error.message
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
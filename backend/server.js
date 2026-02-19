const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');

// 加载环境变量
dotenv.config();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname));
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

// 初始化Express应用
const app = express();

// 安全中间件
app.use(helmet());
app.use(cors({
  origin: ['https://your-wechat-appid.wx.qcloud.la'], // 微信小程序域名
  credentials: true
}));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 创建临时目录（用于存储上传的录音文件）
const fs = require('fs');
if (!fs.existsSync('temp')) {
  fs.mkdirSync('temp');
}

// API路由
app.use('/api', require('./routes'));

// 健康检查路由（兼容前端）
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ielts-vocab-backend'
  });
});

// 音频文件路由
app.use('/api/audio', express.static('./audio'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`雅思背单词后端服务启动成功！端口: ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV}`);
});

module.exports = app;
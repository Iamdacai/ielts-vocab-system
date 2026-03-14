# 发音练习功能说明

## 📋 功能概述

为雅思智能背单词系统添加了发音练习功能，让学习者在学习新单词或复习时可以跟读练习，系统会对发音进行评分并提供反馈。

## 🎯 功能特性

### 1. 跟读练习
- 点击「🎤 跟读练习」按钮开始录音
- 最长录音时间：10 秒
- 实时显示录音时长
- 录音完成后自动上传评分

### 2. 发音评分
- **评分范围**：0-100 分
- **评分维度**：
  - 总分（Score）
  - 准确度（Accuracy）
  - 流利度（Fluency）
- **反馈信息**：根据评分提供个性化建议

### 3. 评分标准
- **90-100 分**：发音非常标准！继续保持！🎉
- **80-89 分**：发音很好，注意个别音节的重音位置。👍
- **70-79 分**：发音基本正确，但某些音素需要改进。💪
- **60-69 分**：发音需要更多练习，建议多听标准发音并跟读。📚
- **0-59 分**：继续加油！多听多练会进步的！🔥

### 4. 重新练习
- 支持无限次重新录音
- 每次录音后显示「🔄 重新练习」按钮
- 保留历史最佳成绩（待实现）

## 🛠️ 技术实现

### 前端（微信小程序）

**文件位置**：`frontend/pages/learning/`

#### learning.wxml
添加了发音练习 UI：
- 跟读练习按钮
- 录音状态指示器（红色脉冲动画）
- 评分结果展示区域
- 重新练习按钮

#### learning.wxss
添加了发音练习样式：
- `.pronunciation-practice` - 练习区域容器
- `.practice-button` - 练习按钮（蓝色渐变）
- `.recording-status` - 录音状态显示
- `.recording-indicator` - 红色脉冲动画
- `.pronunciation-result` - 评分结果卡片
- `.score-display` - 分数展示（大号绿色数字）
- `.retry-button` - 重新练习按钮（橙色渐变）

#### learning.js
添加了发音练习逻辑：
- `initRecorder()` - 初始化录音管理器
- `startPronunciationPractice()` - 开始录音
- `stopPronunciationPractice()` - 停止录音
- `uploadPronunciation()` - 上传录音进行评分
- `startRecordingTimer()` / `stopRecordingTimer()` - 录音计时器

### 后端（Node.js + Express）

**文件位置**：`backend/simple-server-https.js`

#### 新增 API 接口
```
POST /api/pronunciation/analyze
```

**请求参数**：
- `audio` - 音频文件（multipart/form-data）
- `word` - 目标单词（formData）

**响应格式**：
```json
{
  "score": 85,
  "accuracy": 81,
  "fluency": 77,
  "feedback": "发音很好，注意个别音节的重音位置。👍",
  "word": "example",
  "timestamp": "2026-03-15T00:00:00.000Z"
}
```

**实现逻辑**：
1. 使用 Multer 接收音频文件上传
2. 验证文件大小（50KB-300KB 为正常范围）
3. 基于文件大小模拟评分（可替换为真实 API）
4. 生成个性化反馈
5. 清理临时文件

## 🔄 后续优化方向

### 1. 真实发音评分 API
当前使用模拟评分，可替换为：
- **Azure Speech Pronunciation Assessment**
- **Google Cloud Speech-to-Text**
- **讯飞开放平台**
- **百度语音识别**

### 2. 音素级分析
- 识别具体哪个音素发音不准
- 提供针对性的发音指导
- 显示口型/舌位示意图

### 3. 历史记录
- 保存每次练习记录
- 生成发音进步曲线
- 记录最佳成绩

### 4. 对比练习
- 播放标准发音 vs 用户发音
- 波形对比可视化
- 频谱分析

### 5. 社交功能
- 发音排行榜
- 发音挑战
- 分享成绩

## 📝 使用说明

### 学习者使用流程
1. 进入学习页面
2. 查看单词卡片
3. 点击「🎤 跟读练习」
4. 允许录音权限
5. 朗读单词（最长 10 秒）
6. 查看评分和反馈
7. 点击「🔄 重新练习」或继续学习

### 开发者部署流程
1. 确保后端服务运行（端口 3001）
2. 确保 `temp/` 目录存在且可写
3. 小程序配置合法域名：`https://caiyuyang.cn:3001`
4. 小程序配置录音权限：`"scope": "record"`

## 🔧 配置要求

### 小程序配置（app.json）
```json
{
  "permission": {
    "record": {
      "desc": "需要使用您的麦克风进行发音练习"
    }
  }
}
```

### 服务器配置
- Node.js 环境
- Multer 依赖：`npm install multer`
- 临时目录：`backend/temp/`
- HTTPS 证书（已配置）

## 📊 测试验证

### API 测试
```bash
# 测试发音评分接口
curl -k -X POST https://localhost:3001/api/pronunciation/analyze \
  -F "audio=@test-recording.mp3" \
  -F "word=example"
```

### 前端测试
1. 打开微信小程序
2. 进入学习页面
3. 点击「🎤 跟读练习」
4. 朗读单词
5. 查看评分结果

## 🐛 已知问题

1. **模拟评分**：当前使用基于文件大小的模拟评分，不够准确
2. **无历史记录**：练习记录未保存到数据库
3. **无音素分析**：无法指出具体哪个音素发音不准

## 📈 版本历史

### v1.0.0 (2026-03-15)
- ✅ 基础发音练习功能
- ✅ 录音上传和评分
- ✅ 评分结果展示
- ✅ 重新练习功能
- 📝 模拟评分系统
- 📝 临时文件清理

---

**开发者**：AI Assistant  
**创建时间**：2026-03-15  
**最后更新**：2026-03-15

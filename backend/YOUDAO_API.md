# 有道智云 API 配置

## 📦 应用信息

**应用 ID**: `66a43623f468cc4a`
**应用密钥**: `ZYlZSPjKAvyxCJDfaUwEK6GLaJPG6P8O`

## 🔐 环境变量配置

### 后端环境变量文件
创建 `backend/.env` 文件：

```bash
# 有道智云 API 配置
YOUDAO_APP_KEY=66a43623f468cc4a
YOUDAO_SECRET_KEY=ZYlZSPjKAvyxCJDfaUwEK6GLaJPG6P8O
```

### 加载环境变量
在 `backend/simple-server-https.js` 顶部添加：

```javascript
require('dotenv').config();
const YOUDAO_APP_KEY = process.env.YOUDAO_APP_KEY;
const YOUDAO_SECRET_KEY = process.env.YOUDAO_SECRET_KEY;
```

## 📚 API 接口

**文本翻译 API**:
- URL: `https://openapi.youdao.com/api`
- 方法：GET/POST
- 支持语种：中英互译 + 100+ 种语言

**请求参数**:
- `q`: 待翻译文本
- `from`: 源语言 (auto 自动检测)
- `to`: 目标语言 (zh-CHS 简体中文, en 英语)
- `appKey`: 应用 ID
- `salt`: 随机字符串 (UUID)
- `sign`: 签名 (sha256)
- `signType`: v3
- `curtime`: 当前时间戳 (秒)

## 💰 资费说明

- **免费额度**: 50 元体验金 + 100 万字符/月
- **超出后**: 普通文本翻译 48 元/百万字符
- **单次限制**: 5000 字符
- **频率限制**: 100 万次/小时

## 🔗 相关链接

- 控制台：https://ai.youdao.com/console/
- API 文档：https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html
- 体验中心：https://ai.youdao.com/product-fanyi-text.s

---

_配置时间：2026-03-16_

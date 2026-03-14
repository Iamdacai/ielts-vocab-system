# 修复日志 - 配置页面 404 错误

## 问题描述
点击"配置"进入配置页面时报错：
```
GET https://caiyuyang.cn:3001/api/words/libraries 404 (Not Found)
```

## 问题原因
后端服务 `simple-server-https.js` 是一个简化版本，缺少以下 API 端点：
- `/api/words/libraries` - 获取词库列表
- `/api/words/categories` - 获取分类列表

这些端点在完整的 `server.js` 中存在，但在简化版 HTTPS 服务中未实现。

## 修复方案
在 `backend/simple-server-https.js` 中添加了两个新的 API 端点：

### 1. GET /api/words/libraries
返回词库列表，包含：
- `cambridge` - 剑桥雅思 1-18
- `zhenjing` - 雅思词汇真经

### 2. GET /api/words/categories
返回分类列表，支持查询参数：
- `source` - 按来源筛选（如：真经、剑桥）

## 修复步骤
1. 编辑 `backend/simple-server-https.js`
2. 添加两个新的 API 路由处理函数
3. 重启后端服务

## 验证结果
```bash
# 测试词库 API
curl -k https://localhost:3001/api/words/libraries
# 返回：[{"id":"cambridge",...},{"id":"zhenjing",...}]

# 测试分类 API
curl -k "https://localhost:3001/api/words/categories?source=真经"
# 返回：[{"id":"交通旅行",...}, {"id":"动物保护",...}, ...]
```

✅ 两个 API 端点均已正常工作

## 修复时间
2026-03-15 06:23

## 相关文件
- `backend/simple-server-https.js` - 修改的后端服务文件
- `frontend/pages/config/config.js` - 前端配置页面（调用 API 的客户端）

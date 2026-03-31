# Azure Speech 发音评测配置指南

## 📋 功能说明

使用 **Azure Speech Pronunciation Assessment** 进行专业级发音评分。

**评分维度**：
- ✅ 准确度（Accuracy）- 音素发音是否准确
- ✅ 流利度（Fluency）- 语速是否自然流畅
- ✅ 完整度（Completeness）- 单词发音是否完整
- ✅ 总分（Overall Score）- 综合评分

**免费额度**：每月 500 分钟（每天约 16 分钟）

---

## 🔑 获取 Azure API Key

### 步骤 1：登录 Azure 门户

访问：https://portal.azure.com/

如果没有账号：
1. 注册微软账号
2. 新用户送 $200 美元额度（够用很久）

### 步骤 2：创建 Speech Service

1. 点击「创建资源」→ 搜索「Speech」
2. 选择「Speech service」
3. 点击「创建」

### 步骤 3：配置服务

```
订阅：你的订阅
资源组：创建新的（如：ielts-speech）
区域：East Asia（东亚）
名称：ielts-pronunciation（自定义）
定价层：F0（免费层，每月 500 分钟）
```

### 步骤 4：获取 Key 和 Region

1. 创建完成后，进入资源页面
2. 点击「Keys and Endpoint」
3. 复制以下内容：
   - **KEY 1**（或 KEY 2）→ 这就是 `AZURE_SPEECH_KEY`
   - **Location/Region** → 这就是 `AZURE_SPEECH_REGION`

---

## ⚙️ 配置 .env 文件

编辑 `/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend/.env`：

```bash
# Azure Speech 发音评测 API 配置
AZURE_SPEECH_KEY=复制你的 KEY 1（如：a1b2c3d4e5f6...）
AZURE_SPEECH_REGION=eastasia  # 或你选择的区域
```

**区域对应表**：

| 区域代码 | 地区 |
|---------|------|
| `eastasia` | 东亚（推荐） |
| `southeastasia` | 东南亚 |
| `westus` | 美国西部 |
| `eastus` | 美国东部 |
| `westeurope` | 西欧 |

---

## 🧪 测试配置

### 1. 重启后端服务

```bash
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend
ps aux | grep "simple-server-https" | grep -v grep | awk '{print $2}' | xargs kill -9
PORT=3001 node simple-server-https.js > https-server.log 2>&1 &
```

### 2. 查看日志

```bash
tail -f https-server.log | grep -i azure
```

### 3. 测试发音评分

1. 打开小程序 → 开始学习
2. 点击「🎤 跟读练习」
3. 朗读单词并录音
4. 查看控制台日志：

```javascript
[Azure] ========== 开始发音评分 ==========
[Azure] 目标单词：innovation
[Azure] ✅ 评分成功
[Azure] 评分详情：{ 总分：85, 准确度：88, 流利度：82, 完整度：90 }
```

---

## 📊 评分说明

### 分数段含义

| 分数 | 等级 | 说明 |
|------|------|------|
| 90-100 | 🎉 优秀 | 发音非常标准 |
| 80-89 | 👍 很好 | 发音良好，小瑕疵 |
| 70-79 | 💪 良好 | 基本正确，需改进 |
| 60-69 | 📚 一般 | 需要更多练习 |
| 0-59 | 🔥 加油 | 继续练习 |

### 评分维度

**准确度（Accuracy）**：
- 音素发音是否准确
- 元音、辅音是否到位
- 重音位置是否正确

**流利度（Fluency）**：
- 语速是否自然
- 是否有不必要的停顿
- 语调是否流畅

**完整度（Completeness）**：
- 单词是否完整读出
- 是否有漏音、吞音
- 音节是否完整

---

## ⚠️ 常见问题

### 1. "API Key 无效"

**原因**：Key 复制或配置错误

**解决**：
- 重新复制 KEY 1（完整复制，不要有空格）
- 检查 .env 文件格式：`AZURE_SPEECH_KEY=xxxxxxxx`
- 重启后端服务

### 2. "余额不足"

**原因**：免费额度用完

**解决**：
- 检查 Azure 门户的使用量
- 升级到付费层（S0，$1/1000 分钟）
- 或等待下个月额度刷新

### 3. "网络超时"

**原因**：Azure 服务访问慢

**解决**：
- 检查服务器网络连接
- 尝试更换区域（如 southeastasia）
- 增加超时时间（代码中已设为 30 秒）

### 4. "未返回评分结果"

**原因**：音频格式问题或录音太短

**解决**：
- 确保录音时长 > 1 秒
- 检查录音质量（不要太小声）
- 确保朗读的是目标单词

---

## 💡 优化建议

### 1. 录音质量

**建议**：
- 在安静环境录音
- 距离麦克风 10-20cm
- 清晰朗读单词
- 语速适中（不要太快或太慢）

### 2. 参考文本

**当前**：使用单个单词作为参考

**可优化**：如果是句子练习，使用完整句子作为参考文本：

```javascript
'referenceText': 'The innovation revolutionized the industry'
```

### 3. 评分反馈

**当前**：基础反馈

**可优化**：结合 MiniMax 生成个性化建议：

```javascript
// Azure 评分 → MiniMax 生成建议
{
  score: 65,
  issues: ['θ发音不准', '重音错误']
}

→ MiniMax 生成：
"你的/θ/音发成了/s/，建议舌尖轻触上齿..."
```

---

## 📈 使用统计

**免费额度**：500 分钟/月

**使用量查询**：
1. 登录 Azure 门户
2. 进入 Speech Service 资源
3. 点击「Metrics」
4. 查看「Speech to Text」使用量

**估算**：
- 每个单词录音：约 3-5 秒
- 每天 100 个单词：约 5-8 分钟
- 每月可用：60-100 天

---

## 🎯 下一步

配置完成后：
1. ✅ 测试发音评分功能
2. ✅ 查看评分准确度
3. ✅ 收集用户反馈
4. ✅ 根据需要优化

---

**配置完成后，删除此文件中的敏感信息（如 API Key）！**

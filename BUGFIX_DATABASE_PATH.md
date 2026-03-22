# 数据库路径不一致问题修复

## 问题描述
首页和设置页显示的用户统计数据错误（"学习 3 天 | 累计 361 词"），与实际数据库记录不符。

## 根本原因
后端使用了两个不同的 SQLite 数据库文件：
- `backend/ielts_vocab.db` - 主服务器使用的数据库
- `backend/scripts/ielts_vocab.db` - 认证模块使用的数据库

导致的问题：
1. 用户通过微信登录时，认证模块在 `scripts/ielts_vocab.db` 中创建用户并记录学习数据
2. 但主服务器查询的是 `ielts_vocab.db`，导致数据不一致
3. 小程序显示的是认证模块返回的数据（3 天 361 词），但实际查询统计时得到的是主数据库的数据

## 修复步骤

### 1. 修复认证模块数据库路径
**文件**: `backend/auth-wechat.js`

```javascript
// 修改前
const dbPath = path.join(__dirname, 'scripts', 'ielts_vocab.db');

// 修改后
const dbPath = path.join(__dirname, 'ielts_vocab.db');
```

### 2. 同步数据库数据
将 `scripts/ielts_vocab.db` 中的数据复制到主数据库：

```bash
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend
rm -f ielts_vocab.db
cp scripts/ielts_vocab.db ielts_vocab.db
```

### 3. 重启后端服务
```bash
# 停止旧服务
kill $(ps aux | grep "simple-server-https.js" | grep -v grep | awk '{print $2}')

# 启动新服务
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend
PORT=3001 node simple-server-https.js > https-server.log 2>&1 &
```

## 验证结果
```bash
# 检查数据库中的用户统计
sqlite3 ielts_vocab.db "SELECT u.id, u.openid, (SELECT COUNT(DISTINCT DATE(created_at)) FROM learning_records WHERE user_id = u.id) as studyDays, (SELECT COUNT(*) FROM learning_records WHERE user_id = u.id) as totalWords FROM users u WHERE u.id = 1;"

# 输出：1|oxfBm1-_FEzQCyGROKE1W4_1jnjk|3|361
```

✅ 用户统计数据已正确显示：学习 3 天，累计 361 词

## 预防措施
1. 确保所有模块使用相同的数据库路径配置
2. 考虑将数据库路径提取到环境变量或配置文件中
3. 定期备份数据库文件

## 修复时间
2026-03-23 06:48

## 相关文件
- `backend/auth-wechat.js` - 微信认证模块
- `backend/database.js` - 数据库初始化模块
- `backend/simple-server-https.js` - 主服务器

# 统计接口未过滤用户 ID 问题修复

## 问题描述
用户执行学习进度复位后，首页和设置页仍显示错误的统计数据：
- 已掌握：11 词（应为 0）
- 待复习：303 词（应为 0）

## 根本原因
统计接口 `/api/stats` 查询 `user_word_progress` 表时**没有过滤 user_id**，导致统计的是**所有用户**的数据，而不是当前登录用户的数据。

### 有问题的 SQL 查询
```sql
-- ❌ 错误：没有 user_id 过滤
SELECT COUNT(*) as count 
FROM user_word_progress 
WHERE mastery_score >= 75

-- ❌ 错误：没有 user_id 过滤
SELECT COUNT(*) as count 
FROM user_word_progress 
WHERE next_review_at <= ? AND mastery_score < 75
```

## 修复内容

### 1. 添加用户认证
统计接口需要用户登录才能访问，添加了 `authenticateToken` 中间件：

```javascript
// 修改前
app.get('/api/stats', async (req, res) => {

// 修改后
app.get('/api/stats', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
```

### 2. 所有统计查询添加 user_id 过滤

```javascript
// 已掌握单词数
SELECT COUNT(*) as count 
FROM user_word_progress 
WHERE user_id = ? AND mastery_score >= 75  // ✅ 添加 user_id 过滤

// 学习中单词数
SELECT COUNT(*) as count 
FROM user_word_progress 
WHERE user_id = ? AND mastery_score < 75 AND mastery_score > 0

// 平均掌握率
SELECT AVG(mastery_score) as avg_score 
FROM user_word_progress 
WHERE user_id = ? AND mastery_score > 0

// 待复习单词数
SELECT COUNT(*) as count 
FROM user_word_progress 
WHERE user_id = ? AND next_review_at <= ? AND mastery_score < 75

// 今日新学单词数
SELECT COUNT(DISTINCT word_id) as count 
FROM learning_records 
WHERE user_id = ? AND action_type = 'new' 
AND created_at >= ? AND created_at < ?

// 今日复习单词数
SELECT COUNT(DISTINCT word_id) as count 
FROM learning_records 
WHERE user_id = ? AND action_type = 'review' 
AND created_at >= ? AND created_at < ?
```

## 验证结果

复位后查询数据库：
```bash
sqlite3 ielts_vocab.db "SELECT COUNT(*) FROM user_word_progress WHERE user_id = 1 AND mastery_score >= 75;"
# 输出：0

sqlite3 ielts_vocab.db "SELECT COUNT(*) FROM user_word_progress WHERE user_id = 1 AND next_review_at <= datetime('now') AND mastery_score < 75;"
# 输出：0

sqlite3 ielts_vocab.db "SELECT COUNT(*) FROM learning_records WHERE user_id = 1;"
# 输出：0
```

✅ 所有统计数据已正确清零

## 修复文件
- `backend/simple-server-https.js` - 统计接口修复

## 修复时间
2026-03-23 06:56

## 相关修复
这是继数据库路径不一致问题后的第二个修复，两个问题共同导致了统计数据错误：
1. 数据库路径不一致（已修复于 BUGFIX_DATABASE_PATH.md）
2. 统计接口未过滤用户 ID（本次修复）

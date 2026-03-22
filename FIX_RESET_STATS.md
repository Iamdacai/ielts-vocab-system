# 学习进度复位问题修复

## 问题描述
学习进度复位执行后，首页、复习页、设置页的统计数据没有复位为 0。

## 问题原因
1. **后端数据库已正确清零**：`user_word_progress`、`learning_records`、`review_sessions` 等表已清空
2. **前端本地缓存未清除**：小程序的 `ielts_vocab_progress` 本地缓存没有被清除

## 修复内容

### 1. 前端 - profile.js
**文件**: `frontend/pages/profile/profile.js`

**修改**: 在复位成功后清除 `ielts_vocab_progress` 本地缓存

```javascript
// 🆕 清除本地存储的 userInfo、配置缓存和学习进度缓存
wx.removeStorageSync('userInfo');
wx.removeStorageSync('userConfig');
wx.removeStorageSync('ielts_vocab_progress');  // 🆕 清除本地学习进度缓存
```

### 2. 前端 - admin/index.js
**文件**: `frontend/pages/admin/index.js`

**修改**: 在管理员复位后清除本地缓存

```javascript
// 🆕 清除本地缓存（管理员复位后）
wx.removeStorageSync('ielts_vocab_progress');
wx.removeStorageSync('userConfig');
```

## 后端已正确处理的内容
后端 `/api/users/reset-progress` API 已经正确处理了以下表的清零：
- ✅ `user_word_progress` - 用户单词进度
- ✅ `learning_records` - 学习记录
- ✅ `review_sessions` - 复习课
- ✅ `review_session_items` - 复习课详情
- ✅ `pronunciation_practice_records` - 发音练习记录
- ✅ `user_configs` - 用户配置（重置为默认值）

## 测试步骤
1. 登录小程序
2. 进行一些学习操作（学习新单词、复习等）
3. 查看首页统计数据（应有数据）
4. 进入个人中心 → 复位学习进度
5. 确认复位
6. 返回首页，检查统计数据是否全部归零

## 预期结果
复位后，以下数据应全部归零：
- 总单词数：4464（不变，这是词库总数）
- 已掌握单词数：0
- 学习中单词数：0
- 平均掌握分数：0
- 今日新学单词数：0
- 今日复习单词数：0
- 待复习单词数：0
- 掌握率：0%

---
**修复时间**: 2026-03-22  
**修复内容**: 清除前端本地缓存 `ielts_vocab_progress`

# 词库联动功能实现

## 功能概述
词库选择现在与系统其他板块完全联动，包括：
- ✅ 新词学习范围
- ✅ 首页统计数据（总词汇数）
- ✅ 配置保存与加载

## 问题 1：真经词库单词数量

### 数据库统计
```sql
-- 剑桥雅思 1-18: 4464 词
SELECT COUNT(*) FROM ielts_words WHERE cambridge_book BETWEEN 1 AND 18;

-- 雅思词汇真经：8138 词
SELECT COUNT(*) FROM ielts_words WHERE frequency_level IN ('high', 'medium', 'low');
```

### 显示说明
- **剑桥雅思 1-18**: 4464 词 ✅
- **雅思词汇真经**: 8138 词 ✅

数据正确，显示无误。

---

## 问题 2：词库联动实现

### 1. 数据库 Schema 更新
```sql
ALTER TABLE user_configs ADD COLUMN vocab_library TEXT DEFAULT '["cambridge"]';
ALTER TABLE user_configs ADD COLUMN vocab_category TEXT DEFAULT '';
```

### 2. 配置接口更新

#### 加载配置 (`GET /api/config`)
```javascript
// 返回示例
{
  "weekly_new_words_days": [1,2,3,4,5,6,7],
  "daily_new_words_count": 20,
  "review_time": "20:00",
  "vocab_library": ["cambridge", "zhenjing"],  // 🆕
  "vocab_category": ""                         // 🆕
}
```

#### 保存配置 (`POST /api/config`)
```javascript
// 请求体
{
  "vocab_library": ["cambridge", "zhenjing"],
  "vocab_category": "",
  "weekly_new_words_days": [1,2,3,4,5,6,7],
  "daily_new_words_count": 20,
  "review_time": "20:00"
}
```

### 3. 新词学习接口联动 (`GET /api/words/new`)

根据用户选择的词库动态过滤新词范围：

```javascript
// 词库过滤逻辑
if (selectedLibraries.includes('cambridge') && selectedLibraries.includes('zhenjing')) {
  // 两个词库都选，不过滤
  whereClause = '1=1';
} else if (selectedLibraries.includes('cambridge')) {
  // 只选剑桥
  whereClause = 'cambridge_book BETWEEN 1 AND 18';
} else if (selectedLibraries.includes('zhenjing')) {
  // 只选真经
  whereClause = "frequency_level IN ('high', 'medium', 'low')";
}

// SQL 查询
SELECT * FROM ielts_words 
WHERE ${whereClause} 
ORDER BY RANDOM() 
LIMIT ?
```

### 4. 统计接口联动 (`GET /api/stats`)

首页总词汇数根据选择的词库动态计算：

```javascript
// 按词库过滤统计
const totalResult = await db.get(
  `SELECT COUNT(*) as count FROM ielts_words WHERE ${whereClause}`
);
```

### 5. 前端配置加载

**文件**: `frontend/pages/config/config.js`

```javascript
async loadConfig() {
  wx.request({
    url: `${app.globalData.apiUrl}/config`,
    method: 'GET',
    header: {
      'Authorization': `Bearer ${app.globalData.token}`
    },
    success: (res) => {
      if (res.statusCode === 200) {
        const serverConfig = res.data;
        
        this.setData({
          config: {
            ...this.data.config,
            vocab_library: serverConfig.vocab_library || ['cambridge'],
            vocab_category: serverConfig.vocab_category || '',
            weekly_new_words_days: serverConfig.weekly_new_words_days,
            daily_new_words_count: serverConfig.daily_new_words_count,
            review_time: serverConfig.review_time
          }
        });
      }
    }
  });
}
```

---

## 用户体验流程

### 1. 选择词库
1. 用户进入设置页面
2. 点击词库卡片（支持多选）
3. 点击"保存配置"

### 2. 新词学习
1. 用户点击"开始学习"
2. 后端根据用户选择的词库随机抽取新词
3. 只显示选中词库范围内的单词

### 3. 首页统计
1. 首页显示"总词汇"数量
2. 数量根据选择的词库动态计算
3. 例如：
   - 只选剑桥：显示 4464
   - 只选真经：显示 8138
   - 全选：显示 12602（4464+8138）

---

## 测试步骤

### 1. 测试词库保存
```bash
# 获取 token
TOKEN="your_jwt_token"

# 保存配置（只选剑桥）
curl -k -X POST https://caiyuyang.cn:3001/api/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vocab_library":["cambridge"]}'

# 保存配置（只选真经）
curl -k -X POST https://caiyuyang.cn:3001/api/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vocab_library":["zhenjing"]}'

# 保存配置（全选）
curl -k -X POST https://caiyuyang.cn:3001/api/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vocab_library":["cambridge","zhenjing"]}'
```

### 2. 测试新词范围
```bash
# 获取新词（应根据配置返回对应词库的单词）
curl -k -X GET "https://caiyuyang.cn:3001/api/words/new?count=5" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 测试统计数据
```bash
# 获取统计（总词汇数应根据配置变化）
curl -k -X GET https://caiyuyang.cn:3001/api/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 修改文件列表

### 后端
- `backend/simple-server-https.js`
  - `GET /api/config` - 添加认证，返回词库配置
  - `POST /api/config` - 添加认证，保存词库配置
  - `GET /api/words/new` - 添加认证，按词库过滤
  - `GET /api/stats` - 添加认证，按词库统计

### 前端
- `frontend/pages/config/config.js` - 多选逻辑
- `frontend/pages/config/config.wxml` - UI 更新
- `frontend/pages/config/config.wxss` - 样式更新

### 数据库
- `backend/ielts_vocab.db` - 添加 `vocab_library`, `vocab_category` 字段

---

## 注意事项

1. **向后兼容**：如果用户配置表中没有词库字段，默认使用 `['cambridge']`
2. **至少一个词库**：前端限制至少选择一个词库
3. **分类选择**：当选择真经词库时，可以进一步选择分类（高频/中频/低频）
4. **复习不受影响**：复习单词基于用户的学习记录，不受词库选择影响

---

## 完成时间
2026-03-23 09:28

## GitHub 提交
`73f0ae4` - 词库联动功能实现

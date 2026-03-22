# 复习页面按钮导航失效问题修复

## 问题描述
复习页面的"返回"和"去学习新词"两个按钮点击无反应。

## 根本原因
复习页面 (`pages/review/review`) 是 **tabBar 页面**，但按钮使用的导航方法不适用于 tabBar 页面：

### 错误用法
```javascript
// ❌ 错误：tabBar 页面不能使用 navigateBack
wx.navigateBack()

// ❌ 错误：tabBar 页面之间不能使用 navigateTo
wx.navigateTo({
  url: '/pages/learning/learning'
})
```

### 微信小程序页面导航规则
- **tabBar 页面**：必须使用 `wx.switchTab()` 进行跳转
- **普通页面**：可以使用 `wx.navigateTo()` 或 `wx.navigateBack()`
- **tabBar 页面无法使用**：`wx.navigateBack()`、`wx.navigateTo()`

## 修复内容

### 文件：`frontend/pages/review/review.js`

```javascript
// 修复前
goBack() {
  // ...
  wx.navigateBack();  // ❌ 错误
}

goToLearning() {
  wx.navigateTo({   // ❌ 错误
    url: '/pages/learning/learning'
  });
}

// 修复后
goBack() {
  // ...
  wx.switchTab({    // ✅ 正确
    url: '/pages/index/index'
  });
}

goToLearning() {
  wx.switchTab({    // ✅ 正确
    url: '/pages/learning/learning'
  });
}
```

## 修复的按钮

1. **"← 返回"按钮**（九宫格模式左上角）
   - 修复前：点击无反应
   - 修复后：跳转到首页（tabBar）

2. **"去学习新词"按钮**（无复习任务时显示）
   - 修复前：点击无反应
   - 修复后：跳转到新词学习页面（tabBar）

##  tabBar 页面列表
根据 `app.json` 配置，以下页面是 tabBar 页面：
- 首页 (`pages/index/index`)
- 新词学习 (`pages/learning/learning`)
- 复习 (`pages/review/review`)
- 设置 (`pages/config/config`)

## 导航方法速查

| 场景 | 正确方法 | 错误方法 |
|------|---------|---------|
| tabBar → tabBar | `wx.switchTab()` | `wx.navigateTo()` |
| tabBar → 普通页 | `wx.navigateTo()` | - |
| 普通页 → tabBar | `wx.switchTab()` | `wx.navigateBack()` |
| 普通页 → 普通页 | `wx.navigateTo()` | - |
| 普通页返回 | `wx.navigateBack()` | - |
| tabBar 返回 | `wx.switchTab({url: '/pages/index/index'})` | `wx.navigateBack()` |

## 需要操作

请在**微信开发者工具**中：

1. **重新编译**：
   - 点击"编译"按钮

2. **测试按钮**：
   - 进入复习页面
   - 点击"← 返回" → 应跳转到首页
   - 如果没有复习任务，点击"去学习新词" → 应跳转到新词学习页面

## 修复时间
2026-03-23 07:05

## 相关文件
- `frontend/pages/review/review.js` - 复习页面逻辑
- `frontend/app.json` - tabBar 配置

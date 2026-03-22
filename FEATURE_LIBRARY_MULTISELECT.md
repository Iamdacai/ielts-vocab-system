# 词库多选功能实现

## 功能描述
设置页面的词库选择从单选改为多选，用户可以同时选择多个词库进行学习。

## 修改内容

### 1. 前端数据结构调整
**文件**: `frontend/pages/config/config.js`

```javascript
// 修改前
config: {
  vocab_library: 'cambridge',  // 字符串，单选
}

// 修改后
config: {
  vocab_library: ['cambridge'],  // 数组，多选
}
```

### 2. 加载词库时初始化选中状态
```javascript
async loadLibraries() {
  const libraries = res.data;
  
  // 从后端获取用户已选的词库，如果没有则默认全选
  const selectedLibraries = this.data.config.vocab_library || libraries.map(lib => lib.id);
  
  // 为每个词库添加 selected 状态
  const librariesWithSelected = libraries.map(lib => ({
    ...lib,
    selected: selectedLibraries.includes(lib.id)
  }));
  
  this.setData({ 
    libraries: librariesWithSelected,
    'config.vocab_library': selectedLibraries
  });
}
```

### 3. 切换选择逻辑（支持多选）
```javascript
toggleLibrary(e) {
  const libraryId = e.currentTarget.dataset.id;
  const selectedLibraries = this.data.config.vocab_library || [];
  
  // 切换选中状态
  const index = selectedLibraries.indexOf(libraryId);
  let newSelected;
  
  if (index > -1) {
    // 已选中，取消选中
    newSelected = selectedLibraries.filter(id => id !== libraryId);
  } else {
    // 未选中，添加
    newSelected = [...selectedLibraries, libraryId];
  }
  
  // 🆕 至少保留一个词库
  if (newSelected.length === 0) {
    wx.showToast({
      title: '至少选择一个词库',
      icon: 'none'
    });
    return;
  }
  
  // 更新 libraries 数组的 selected 状态
  const updatedLibraries = this.data.libraries.map(lib => ({
    ...lib,
    selected: newSelected.includes(lib.id)
  }));
  
  this.setData({
    libraries: updatedLibraries,
    'config.vocab_library': newSelected,
    'config.vocab_category': ''  // 重置分类选择
  });
  
  wx.showToast({
    title: `已选择 ${newSelected.length} 个词库`,
    icon: 'success',
    duration: 1500
  });
}
```

### 4. UI 模板修改
**文件**: `frontend/pages/config/config.wxml`

```xml
<!-- 🆕 词库选择（支持多选）-->
<view class="config-section">
  <view class="subtitle">选择词库（多选）</view>
  <view class="library-selector">
    <view 
      wx:for="{{libraries}}" 
      wx:key="id"
      class="library-item {{item.selected ? 'selected' : ''}}"
      data-id="{{item.id}}"
      bindtap="toggleLibrary">
      <view class="library-checkbox">
        <view class="checkbox-icon {{item.selected ? 'checked' : ''}}">
          <text wx:if="{{item.selected}}">✓</text>
        </view>
      </view>
      <view class="library-info">
        <view class="library-name">{{item.name}}</view>
        <view class="library-desc">{{item.description}}</view>
        <view class="library-count">{{item.word_count}} 词</view>
      </view>
    </view>
  </view>
  <view class="selected-hint">已选择 {{config.vocab_library.length}} 个词库</view>
</view>
```

### 5. 样式更新
**文件**: `frontend/pages/config/config.wxss`

添加了复选框样式、多选布局样式、已选提示样式等。

### 6. 保存配置
```javascript
saveConfig() {
  const configData = {
    vocab_library: this.data.config.vocab_library,  // 🆕 词库数组
    vocab_category: this.data.config.vocab_category,
    weekly_new_words_days: this.data.config.weekly_new_words_days,
    daily_new_words_count: parseInt(this.data.config.daily_new_words_count) || 20,
    review_time: this.data.config.review_time || '20:00'
  };
  
  wx.request({
    url: `${app.globalData.apiUrl}/config`,
    method: 'POST',
    data: configData
  });
}
```

## UI 效果

### 词库列表
- 每个词库左侧显示圆形复选框
- 选中时复选框变为蓝色，显示 ✓ 标记
- 词库卡片背景变为浅蓝色
- 底部显示"已选择 X 个词库"提示

### 交互
- 点击词库卡片切换选中状态
- 至少保留一个词库（防止全部取消）
- 切换词库时重置分类选择
- 显示 Toast 提示已选词库数量

## 后端兼容性

后端 `/api/config` 接口需要支持接收数组格式的 `vocab_library`：

```json
{
  "vocab_library": ["cambridge", "zhenjing"],
  "vocab_category": "",
  "weekly_new_words_days": [1, 2, 3, 4, 5, 6, 7],
  "daily_new_words_count": 20,
  "review_time": "20:00"
}
```

## 后续优化

1. **后端支持**：更新后端配置接口，支持存储多个词库
2. **学习逻辑**：修改新词学习接口，从多个词库中随机选题
3. **分类选择**：当选择多个词库时，分类选择需要支持多词库分类

## 测试步骤

1. 打开设置页面
2. 点击词库卡片，观察复选框状态变化
3. 尝试取消所有词库，应提示"至少选择一个词库"
4. 选择多个词库，底部显示正确数量
5. 点击"保存配置"，验证后端接收正确数据

## 修改时间
2026-03-23 07:16

## 相关文件
- `frontend/pages/config/config.js`
- `frontend/pages/config/config.wxml`
- `frontend/pages/config/config.wxss`

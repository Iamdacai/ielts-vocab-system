# 小程序配置说明

## ⚠️ 开发阶段配置

### 微信开发者工具设置

1. **打开项目后首次配置**：
   - 点击右上角 **详情**（或按 `Ctrl + D`）
   - 切换到 **本地设置** 标签
   - ✅ 勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**

2. **基础库版本**：
   - 选择 **2.19.4** 或 **2.28.0**（稳定版本）
   - 避免使用 3.x 灰度版本

---

## 🌐 服务器域名配置（生产环境）

### 微信公众平台配置

登录：https://mp.weixin.qq.com

#### 1. 服务器域名

**request 合法域名**：
```
https://caiyuyang.cn
```

**uploadFile 合法域名**：
```
https://caiyuyang.cn
```

**downloadFile 合法域名**：
```
https://caiyuyang.cn
```

#### 2. 配置步骤

1. 登录微信公众平台
2. 进入 **开发** → **开发管理** → **开发设置**
3. 找到 **服务器域名** 区域
4. 点击 **修改**
5. 在对应类型中添加域名
6. 保存并等待生效（约 5 分钟）

---

## 📱 app.js 配置

```javascript
// app.js
const serverDomain = 'caiyuyang.cn';
const serverPort = '3001';
const apiUrl = `https://${serverDomain}:${serverPort}/api`;

App({
  globalData: {
    apiUrl: apiUrl,
    hasLogin: false,
    token: null,
    userInfo: null
  }
});
```

---

## 🔧 常见问题

### 1. 音频播放错误 `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`

**原因**：域名未配置或域名校验开启

**解决**：
- 开发阶段：勾选"不校验合法域名"
- 生产环境：在小程序后台配置 downloadFile 域名

### 2. 网络连接错误 `ERR_CONNECTION_REFUSED`

**原因**：后端服务未启动或端口错误

**解决**：
```bash
# 检查服务状态
ps aux | grep simple-server-https.js

# 重启服务
cd backend
PORT=3001 node simple-server-https.js > https-server.log 2>&1 &
```

### 3. SSL 证书错误

**原因**：证书过期或路径错误

**解决**：
```bash
# 检查证书
ls -la /etc/letsencrypt/live/caiyuyang.cn/

# 更新证书
certbot renew
```

---

## 📋 配置检查清单

开发前检查：
- [ ] 微信开发者工具已关闭域名校验
- [ ] 基础库版本设置为 2.19.4 或 2.28.0
- [ ] 后端服务已启动（端口 3001）
- [ ] app.js 中 apiUrl 配置正确

上线前检查：
- [ ] 小程序后台已配置服务器域名
- [ ] SSL 证书有效
- [ ] 后端服务运行正常
- [ ] 所有功能测试通过

---

_最后更新：2026-03-17_

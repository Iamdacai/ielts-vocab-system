# 🔧 前端登录网络错误排查指南

## 问题现象
前端登录时报"网络错误"

## 可能原因及解决方案

### 1. 服务器域名未配置（最常见）⭐

**症状**：小程序报网络错误，但后端服务正常

**解决方案**：
1. 登录 [微信小程序后台](https://mp.weixin.qq.com/)
2. 进入 **开发** → **开发管理** → **开发设置**
3. 找到 **服务器域名** 配置
4. 添加 `request 合法域名`：
   ```
   https://caiyuyang.cn:3001
   ```
5. 保存配置（注意：每月只能修改 5 次）

**⚠️ 重要**：
- 必须包含协议 `https://`
- 必须包含端口号 `:3001`
- 保存后需要 **重新编译小程序** 才能生效

---

### 2. HTTPS 证书问题

**症状**：开发工具可以访问，真机调试报错

**检查方法**：
```bash
curl -v https://caiyuyang.cn:3001/health
```

**解决方案**：
- 确保证书有效（Let's Encrypt 证书 3 个月过期）
- 检查证书路径：`/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/ssl`
- 重新申请证书：
  ```bash
  certbot renew
  ```

---

### 3. 后端服务未启动

**症状**：所有请求都失败

**检查方法**：
```bash
ps aux | grep simple-server-https
curl -k https://caiyuyang.cn:3001/health
```

**解决方案**：
```bash
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend
PORT=3001 node simple-server-https.js > https-server.log 2>&1 &
```

---

### 4. 防火墙阻止访问

**症状**：本地可以访问，远程无法访问

**检查方法**：
```bash
# 检查防火墙状态
sudo ufw status

# 检查端口监听
netstat -tlnp | grep 3001
```

**解决方案**：
```bash
# 开放 3001 端口
sudo ufw allow 3001/tcp
sudo ufw reload
```

---

### 5. 前端 API 配置错误

**检查文件**：`frontend/app.js`

**确认配置**：
```javascript
this.globalData = {
  apiUrl: `https://caiyuyang.cn:3001/api`
};
```

---

### 6. 开发工具缓存问题

**症状**：配置已修改但仍报错

**解决方案**：
1. 微信开发者工具 → **工具** → **清除缓存**
2. 勾选 **清除全部缓存**
3. 点击 **确定**
4. 重新编译项目

---

## 快速诊断流程

1. ✅ **检查后端服务**：`curl -k https://caiyuyang.cn:3001/health`
2. ✅ **检查 SSL 证书**：浏览器访问 `https://caiyuyang.cn:3001/health`
3. ✅ **检查小程序域名配置**：微信后台 → 服务器域名
4. ✅ **清除缓存重新编译**：开发工具 → 清除缓存 → 重新编译

---

## 测试 API

```bash
# 健康检查
curl -k https://caiyuyang.cn:3001/health

# 登录接口
curl -k -X POST https://caiyuyang.cn:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 词库列表（需要 token）
curl -k https://caiyuyang.cn:3001/api/words/libraries \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 常见错误代码

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `request:fail url not in domain list` | 域名未配置 | 微信后台添加服务器域名 |
| `request:fail timeout` | 服务未启动或防火墙 | 检查服务状态和防火墙 |
| `request:fail ssl handshake error` | SSL 证书问题 | 检查证书有效性 |
| `404 Not Found` | 路由不存在 | 检查 API 路径 |
| `401 Unauthorized` | Token 无效或过期 | 重新登录 |

---

## 联系支持

如果以上方法都无法解决，请提供：
1. 完整的错误信息
2. 微信开发者工具控制台日志
3. 后端日志：`tail -100 backend/https-server.log`

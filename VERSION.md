# 版本管理记录

## 📌 基线版本

### v1.0.0-baseline（2026-03-17）

**提交哈希**: `c3cd018`  
**标签**: `v1.0.0-baseline`  
**GitHub**: https://github.com/Iamdacai/ielts-vocab-system/tree/v1.0.0-baseline

**版本说明**: 账号管理系统开发前的稳定基线版本

**已验证可用的功能**:
- ✅ 单词发音播放（有道 TTS 动态获取 + 本地缓存）
- ✅ 发音练习（录音 + 评分 + 反馈）- 学习页面 + 复习页面
- ✅ 发音历史记录和统计
- ✅ 配置页面（词库选择 + 分类选择）
- ✅ 新词学习（发音 + 跟读）
- ✅ 复习功能（JSON 安全解析 + 发音 + 跟读）
- ✅ HTTPS 证书（Let's Encrypt 正式证书）
- ✅ 微信登录（测试账号）

**后端服务**:
- 端口：3001 (HTTPS)
- 域名：https://caiyuyang.cn:3001
- SSL 证书：Let's Encrypt（有效期至 2026-06-15）

**数据库**:
- 类型：SQLite
- 文件：`backend/ielts_vocab.db`
- 单词数：4464 个

---

## 🔄 回滚方法

如果后续开发遇到问题，可以回滚到此基线版本：

```bash
# 1. 切换到基线版本
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system
git checkout v1.0.0-baseline

# 2. 或者创建新分支进行修复
git checkout -b hotfix/xxx v1.0.0-baseline

# 3. 恢复主分支到基线（谨慎使用）
git checkout master
git reset --hard v1.0.0-baseline
git push origin master --force
```

---

## 📝 待开发功能（账号管理系统）

详见 `docs/账号管理系统 PRD.md`

**核心功能**:
- [ ] 微信账号登录
- [ ] 多账号数据隔离
- [ ] 管理员账号体系
- [ ] 学习状态复位功能
- [ ] 个人中心页面
- [ ] 管理员后台

---

## 📋 历史提交记录

```bash
# 查看完整提交历史
git log --oneline --all

# 查看标签列表
git tag -l

# 查看某个版本的变更
git show v1.0.0-baseline
```

---

_最后更新：2026-03-17 22:13_

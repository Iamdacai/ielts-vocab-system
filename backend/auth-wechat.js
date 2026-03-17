/**
 * 微信登录认证模块
 * 处理微信小程序登录流程
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 微信 API 配置
const APP_ID = process.env.WECHAT_APP_ID;
const APP_SECRET = process.env.WECHAT_APP_SECRET;
const LOGIN_URL = 'https://api.weixin.qq.com/sns/jscode2session';

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 管理员配置
const ADMIN_OPENID = process.env.ADMIN_OPENID;

const dbPath = path.join(__dirname, 'scripts', 'ielts_vocab.db');

/**
 * 获取数据库连接
 */
function getDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

/**
 * 微信登录 - 通过 code 换取 openid
 */
async function wechatLogin(code) {
  try {
    // 1. 调用微信接口换取 openid
    const response = await axios.get(LOGIN_URL, {
      params: {
        appid: APP_ID,
        secret: APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    const { openid, session_key, errcode, errmsg } = response.data;

    if (errcode || !openid) {
      throw new Error(`微信登录失败：${errmsg || '未知错误'}`);
    }

    // 2. 查询或创建用户
    const db = await getDb();
    
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE openid = ?',
        [openid],
        async (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // 用户已存在，更新最后登录时间
            db.run(
              'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
              [row.id],
              (err) => {
                if (err) console.error('更新登录时间失败:', err);
              }
            );
            resolve(row);
          } else {
            // 创建新用户
            db.run(
              'INSERT INTO users (openid, role, status, last_login_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
              [openid, 'user', 'active'],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve({
                  id: this.lastID,
                  openid,
                  role: 'user',
                  status: 'active',
                  created_at: new Date().toISOString()
                });
              }
            );
          }
        }
      );
    });

    // 检查用户状态
    if (user.status === 'banned') {
      db.close();
      throw new Error('账号已被封禁');
    }

    // 3. 生成 JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        openid: user.openid,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 4. 获取用户 profile
    const profile = await new Promise((resolve) => {
      db.get(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [user.id],
        (err, row) => {
          resolve(row || null);
        }
      );
    });

    // 5. 获取用户统计数据
    const stats = await getUserStats(db, user.id);

    db.close();

    // 6. 返回登录信息
    return {
      token,
      user: {
        id: user.id,
        openid: user.openid,
        role: user.role,
        nickname: profile?.nickname || '微信用户',
        avatar: profile?.avatar_url || '',
        studyDays: stats.studyDays,
        totalWords: stats.totalWords,
        isFirstLogin: !profile
      }
    };
  } catch (error) {
    console.error('微信登录错误:', error);
    throw error;
  }
}

/**
 * 获取用户统计数据
 */
async function getUserStats(db, userId) {
  return new Promise((resolve) => {
    db.get(
      `SELECT 
         COUNT(DISTINCT DATE(created_at)) as studyDays,
         COUNT(*) as totalWords
       FROM learning_records 
       WHERE user_id = ?`,
      [userId],
      (err, row) => {
        resolve({
          studyDays: row?.studyDays || 0,
          totalWords: row?.totalWords || 0
        });
      }
    );
  });
}

/**
 * 更新用户 profile
 */
async function updateUserProfile(userId, profileData) {
  const db = await getDb();
  
  try {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO user_profiles 
         (user_id, nickname, avatar_url, gender, city, province, country, language, last_login_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          userId,
          profileData.nickname,
          profileData.avatarUrl,
          profileData.gender || 0,
          profileData.city,
          profileData.province,
          profileData.country,
          profileData.language || 'zh_CN'
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  } finally {
    db.close();
  }
}

/**
 * 验证 JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 检查是否是管理员
 */
function isAdmin(user) {
  return user?.role === 'admin' || (ADMIN_OPENID && user?.openid === ADMIN_OPENID);
}

module.exports = {
  wechatLogin,
  updateUserProfile,
  verifyToken,
  isAdmin,
  JWT_SECRET
};

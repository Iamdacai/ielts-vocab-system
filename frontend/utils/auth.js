/**
 * 认证工具模块
 * 处理微信登录、token 管理、用户信息等功能
 */

const API_BASE = 'https://caiyuyang.cn:3001/api';

/**
 * 存储 key
 */
const TOKEN_KEY = 'ielts_auth_token';
const USER_INFO_KEY = 'ielts_user_info';

/**
 * 微信登录
 * @param {string} code - 微信登录 code
 * @returns {Promise<{token: string, user: object}>}
 */
async function login(code) {
  try {
    const response = await wx.request({
      url: `${API_BASE}/auth/login`,
      method: 'POST',
      data: { code },
      header: {
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200 && response.data.token) {
      // 保存 token 和用户信息
      await setToken(response.data.token);
      await setUserInfo(response.data);
      return response.data;
    } else {
      throw new Error(response.data.message || '登录失败');
    }
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

/**
 * 获取存储的 token
 * @returns {string|null}
 */
function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || null;
  } catch (error) {
    console.error('获取 token 失败:', error);
    return null;
  }
}

/**
 * 保存 token
 * @param {string} token 
 */
async function setToken(token) {
  try {
    await wx.setStorage({
      key: TOKEN_KEY,
      data: token
    });
  } catch (error) {
    console.error('保存 token 失败:', error);
  }
}

/**
 * 移除 token
 */
function removeToken() {
  try {
    wx.removeStorageSync(TOKEN_KEY);
  } catch (error) {
    console.error('移除 token 失败:', error);
  }
}

/**
 * 获取用户信息
 * @returns {object|null}
 */
function getUserInfo() {
  try {
    return wx.getStorageSync(USER_INFO_KEY) || null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 保存用户信息
 * @param {object} userInfo 
 */
async function setUserInfo(userInfo) {
  try {
    await wx.setStorage({
      key: USER_INFO_KEY,
      data: userInfo
    });
  } catch (error) {
    console.error('保存用户信息失败:', error);
  }
}

/**
 * 移除用户信息
 */
function removeUserInfo() {
  try {
    wx.removeStorageSync(USER_INFO_KEY);
  } catch (error) {
    console.error('移除用户信息失败:', error);
  }
}

/**
 * 检查是否已登录
 * @returns {boolean}
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * 获取当前用户 ID
 * @returns {number|null}
 */
function getUserId() {
  const userInfo = getUserInfo();
  return userInfo?.user?.id || null;
}

/**
 * 检查是否是管理员
 * @returns {boolean}
 */
function isAdmin() {
  const userInfo = getUserInfo();
  return userInfo?.user?.role === 'admin';
}

/**
 * 退出登录
 */
async function logout() {
  try {
    const token = getToken();
    if (token) {
      // 调用后端退出接口（可选）
      await wx.request({
        url: `${API_BASE}/auth/logout`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => {}); // 忽略错误
    }
  } finally {
    // 清除本地数据
    removeToken();
    removeUserInfo();
  }
}

/**
 * 发起需要认证的请求
 * @param {object} options - wx.request 选项
 * @returns {Promise}
 */
async function request(options) {
  const token = getToken();
  
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      header: {
        ...options.header,
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        // 处理 token 过期
        if (res.statusCode === 401 || res.statusCode === 403) {
          logout();
          wx.showToast({
            title: '登录已过期',
            icon: 'none'
          });
          // 跳转到登录页
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' });
          }, 1500);
          reject(new Error('登录已过期'));
        } else {
          resolve(res);
        }
      },
      fail: reject
    });
  });
}

/**
 * 获取用户个人资料
 * @returns {Promise<object>}
 */
async function getProfile() {
  const res = await request({
    url: `${API_BASE}/users/profile`,
    method: 'GET'
  });
  return res.data;
}

/**
 * 更新用户个人资料
 * @param {object} profileData 
 * @returns {Promise<object>}
 */
async function updateProfile(profileData) {
  const res = await request({
    url: `${API_BASE}/users/profile`,
    method: 'PUT',
    data: profileData
  });
  return res.data;
}

/**
 * 复位学习进度
 * @param {string} reason - 复位原因
 * @returns {Promise<object>}
 */
async function resetProgress(reason) {
  const res = await request({
    url: `${API_BASE}/users/reset-progress`,
    method: 'POST',
    data: {
      confirm: true,
      reason: reason || 'restart'
    }
  });
  return res.data;
}

/**
 * 获取管理员统计
 * @returns {Promise<object>}
 */
async function getAdminStats() {
  const res = await request({
    url: `${API_BASE}/admin/stats`,
    method: 'GET'
  });
  return res.data;
}

/**
 * 获取用户列表（管理员）
 * @param {number} page 
 * @param {number} pageSize 
 * @returns {Promise<object>}
 */
async function getUserList(page = 1, pageSize = 20) {
  const res = await request({
    url: `${API_BASE}/admin/users`,
    method: 'GET',
    data: { page, pageSize }
  });
  return res.data;
}

module.exports = {
  login,
  logout,
  getToken,
  setToken,
  removeToken,
  getUserInfo,
  setUserInfo,
  removeUserInfo,
  isLoggedIn,
  getUserId,
  isAdmin,
  request,
  getProfile,
  updateProfile,
  resetProgress,
  getAdminStats,
  getUserList,
  TOKEN_KEY,
  USER_INFO_KEY
};

/**
 * 后台管理系统 - 前端逻辑
 */

// 立即执行初始化
(function initApp() {
  console.log('🚀 开始初始化管理后台...');
  console.log('📦 Vue 状态:', typeof Vue);
  console.log('📦 Element Plus 状态:', typeof ElementPlus);
  console.log('📦 DOM 状态:', document.readyState);
  
  const { createApp, ref, reactive, computed, onMounted, watch } = Vue;
  
  console.log('✅ Vue 已加载');
  
  const app = createApp({
    setup() {
      // API 基础地址
      const API_BASE = '/api/admin';
      
      // 登录状态
      const isLoggedIn = ref(false);
      const loginLoading = ref(false);
      const adminInfo = ref(null);
      
      // 登录表单
      const loginForm = reactive({
        username: '',
        password: '',
        remember: false
      });
      
      const loginRules = {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      };
      
      // 当前菜单
      const currentMenu = ref('dashboard');
      
      // 统计数据
      const stats = reactive({
        overview: null,
        wordbooks: [],
        mistakes: { topMistakes: [] },
        trends: { userGrowth: [], studyActivity: [] }
      });
      
      // 词库管理
      const wordbookLoading = ref(false);
      const wordbooks = ref([]);
      const wordbookPage = ref(1);
      const wordbookPageSize = ref(20);
      const wordbookTotal = ref(0);
      const wordbookSearch = ref('');
      const wordbookDialogVisible = ref(false);
      const isEditWordbook = ref(false);
      const wordbookForm = reactive({
        id: null,
        name: '',
        description: '',
        status: 'active'
      });
      
      // 用户管理
      const userLoading = ref(false);
      const users = ref([]);
      const userPage = ref(1);
      const userPageSize = ref(20);
      const userTotal = ref(0);
      const userSearch = ref('');
      const userStatus = ref('');
      
      // 操作日志
      const logsLoading = ref(false);
      const logs = ref([]);
      
      // 错题本
      const mistakesLoading = ref(false);
      const mistakes = ref([]);
      
      // 系统配置
      const config = reactive({
        learning: {
          defaultDailyNewWords: 20,
          defaultReviewTime: '20:00'
        },
        reminder: {
          enabled: true,
          maxRemindersPerDay: 3
        },
        system: {
          maintenanceMode: false,
          allowRegistration: true
        }
      });
      
      // 数据导出
      const exportUserFormat = ref('excel');
      const exportWordFormat = ref('excel');
      const exportLearningDate = ref([]);
      
      // 词库单词列表
      const wordListDialogVisible = ref(false);
      const currentWordbook = ref(null);
      const wordList = ref([]);
      const wordListLoading = ref(false);
      const wordListPage = ref(1);
      const wordListPageSize = ref(50);
      const wordListTotal = ref(0);
      const wordSearch = ref('');
      
      // P1 功能 - 成就系统
      const achievements = ref([]);
      const achievementStats = reactive({
        totalAchievements: 0,
        totalAchieved: 0,
        usersWithAchievements: 0,
        achievementRate: 0
      });
      
      // P1 功能 - 提醒管理
      const reminderConfig = reactive({
        enabled: true,
        defaultTime: new Date(2024, 0, 1, 20, 0),
        maxRemindersPerDay: 3
      });
      const notificationTemplates = ref([]);
      
      // P2 功能 - 异常检测
      const anomalyDays = ref(7);
      const anomalyLoading = ref(false);
      const anomalyData = ref(null);
      
      // P2 功能 - 数据清理
      const cleanupAnalysis = ref(null);
      const cleanupLoading = ref(false);
      
      // 菜单标题
      const menuTitle = computed(() => {
        const titles = {
          dashboard: '📊 数据概览',
          wordbooks: '📚 词库管理',
          users: '👥 用户管理',
          mistakes: '❌ 错题本',
          stats: '📈 统计分析',
          logs: '📋 操作日志'
        };
        return titles[currentMenu.value] || '后台管理';
      });
      
      // 检查登录状态
      const checkLogin = () => {
        const token = localStorage.getItem('admin_token');
        if (token) {
          isLoggedIn.value = true;
          loadAdminInfo();
          loadDashboard();
        }
      };
      
      // 加载管理员信息
      const loadAdminInfo = async () => {
        try {
          const token = localStorage.getItem('admin_token');
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            adminInfo.value = data.admin;
          } else {
            logout();
          }
        } catch (error) {
          console.error('加载管理员信息失败:', error);
          logout();
        }
      };
      
      // 登录
      const handleLogin = async () => {
        loginLoading.value = true;
        
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginForm)
          });
          
          const data = await res.json();
          
          if (res.ok) {
            localStorage.setItem('admin_token', data.token);
            isLoggedIn.value = true;
            adminInfo.value = data.admin;
            ElementPlus.ElMessage.success('登录成功');
            loadDashboard();
          } else {
            ElementPlus.ElMessage.error(data.message || '登录失败');
          }
        } catch (error) {
          console.error('登录失败:', error);
          ElementPlus.ElMessage.error('网络错误，请稍后重试');
        } finally {
          loginLoading.value = false;
        }
      };
      
      // 登出
      const logout = async () => {
        try {
          const token = localStorage.getItem('admin_token');
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error('登出失败:', error);
        }
        
        localStorage.removeItem('admin_token');
        isLoggedIn.value = false;
        adminInfo.value = null;
        ElementPlus.ElMessage.success('已退出登录');
      };
      
      // 处理下拉菜单
      const handleCommand = (command) => {
        if (command === 'logout') {
          logout();
        } else if (command === 'password') {
          ElementPlus.ElMessage.info('修改密码功能开发中');
        }
      };
      
      // 加载仪表盘数据
      const loadDashboard = async () => {
        const token = localStorage.getItem('admin_token');
        
        try {
          // 加载概览数据
          const overviewRes = await fetch(`${API_BASE}/stats/overview`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (overviewRes.ok) {
            const data = await overviewRes.json();
            stats.overview = data.overview;
            console.log('✅ Dashboard 数据加载成功:', stats.overview);
          }
          
          // 加载词库统计
          const wordbooksRes = await fetch(`${API_BASE}/stats/wordbooks`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (wordbooksRes.ok) {
            const data = await wordbooksRes.json();
            stats.wordbooks = data.wordbooks.slice(0, 10);
          }
          
          // 加载错题统计
          const mistakesRes = await fetch(`${API_BASE}/stats/mistakes`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (mistakesRes.ok) {
            const data = await mistakesRes.json();
            stats.mistakes = data.mistakes;
          }
        } catch (error) {
          console.error('加载仪表盘数据失败:', error);
        }
      };
      
      // 加载词库列表
      const loadWordbooks = async () => {
        wordbookLoading.value = true;
        const token = localStorage.getItem('admin_token');
        
        try {
          const params = new URLSearchParams({
            page: wordbookPage.value,
            pageSize: wordbookPageSize.value
          });
          
          if (wordbookSearch.value) {
            params.append('search', wordbookSearch.value);
          }
          
          const res = await fetch(`${API_BASE}/wordbooks?${params}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            wordbooks.value = data.wordbooks;
            wordbookTotal.value = data.total;
            console.log('✅ 词库列表加载成功:', wordbooks.value.length, '个');
          }
        } catch (error) {
          console.error('加载词库列表失败:', error);
          ElementPlus.ElMessage.error('加载失败');
        } finally {
          wordbookLoading.value = false;
        }
      };
      
      // 显示创建词库对话框
      const showCreateWordbookDialog = () => {
        isEditWordbook.value = false;
        wordbookForm.id = null;
        wordbookForm.name = '';
        wordbookForm.description = '';
        wordbookForm.status = 'active';
        wordbookDialogVisible.value = true;
      };
      
      // 编辑词库
      const editWordbook = (row) => {
        isEditWordbook.value = true;
        wordbookForm.id = row.id;
        wordbookForm.name = row.name;
        wordbookForm.description = row.description || '';
        wordbookForm.status = row.status;
        wordbookDialogVisible.value = true;
      };
      
      // 保存词库
      const saveWordbook = async () => {
        if (!wordbookForm.name) {
          ElementPlus.ElMessage.warning('请输入词库名称');
          return;
        }
        
        const token = localStorage.getItem('admin_token');
        
        try {
          let res;
          
          if (isEditWordbook.value) {
            res = await fetch(`${API_BASE}/wordbooks/${encodeURIComponent(wordbookForm.id)}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(wordbookForm)
            });
          } else {
            res = await fetch(`${API_BASE}/wordbooks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(wordbookForm)
            });
          }
          
          const data = await res.json();
          
          if (res.ok) {
            ElementPlus.ElMessage.success(isEditWordbook.value ? '更新成功' : '创建成功');
            wordbookDialogVisible.value = false;
            loadWordbooks();
          } else {
            ElementPlus.ElMessage.error(data.error || '操作失败');
          }
        } catch (error) {
          console.error('保存词库失败:', error);
          ElementPlus.ElMessage.error('网络错误');
        }
      };
      
      // 删除词库
      const deleteWordbook = async (row) => {
        try {
          await ElementPlus.ElMessageBox.confirm(
            `确定要删除词库"${row.name}"吗？此操作不可恢复。`,
            '删除确认',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning'
            }
          );
        } catch {
          return;
        }
        
        const token = localStorage.getItem('admin_token');
        
        try {
          const res = await fetch(`${API_BASE}/wordbooks/${encodeURIComponent(row.id)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const data = await res.json();
          
          if (res.ok) {
            ElementPlus.ElMessage.success('删除成功');
            loadWordbooks();
          } else {
            if (data.activeUsers || data.learningUsers) {
              ElementPlus.ElMessage.error(
                `无法删除：${data.message} (${data.activeUsers || 0} 人在学，${data.learningUsers || 0} 人有记录)`
              );
            } else {
              ElementPlus.ElMessage.error(data.error || '删除失败');
            }
          }
        } catch (error) {
          console.error('删除词库失败:', error);
          ElementPlus.ElMessage.error('网络错误');
        }
      };
      
      // 查看词库单词
      const viewWordbookWords = async (row) => {
        currentWordbook.value = row;
        wordListPage.value = 1;
        wordList.value = [];
        wordListDialogVisible.value = true;
        await loadWordbookWords();
      };
      
      // 加载词库单词列表
      const loadWordbookWords = async () => {
        wordListLoading.value = true;
        const token = localStorage.getItem('admin_token');
        
        try {
          const params = new URLSearchParams({
            page: wordListPage.value,
            pageSize: wordListPageSize.value
          });
          
          if (wordSearch.value) {
            params.append('search', wordSearch.value);
          }
          
          const wordbookId = currentWordbook.value.id;
          console.log('🔍 请求词库单词:', wordbookId);
          
          const res = await fetch(
            `${API_BASE}/wordbooks/${encodeURIComponent(wordbookId)}/words?${params}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          console.log('📡 API 响应状态:', res.status);
          
          if (res.ok) {
            const data = await res.json();
            console.log('✅ 单词列表加载成功:', data.words?.length || 0, '个，总数:', data.total);
            console.log('📦 示例数据:', data.words?.[0]);
            wordList.value = data.words || [];
            wordListTotal.value = data.total || 0;
          } else {
            const error = await res.json();
            console.error('❌ API 错误:', error);
            ElementPlus.ElMessage.error(error.error || '加载失败');
            wordList.value = [];
          }
        } catch (error) {
          console.error('💥 加载单词列表异常:', error);
          ElementPlus.ElMessage.error('加载失败：' + error.message);
          wordList.value = [];
        } finally {
          wordListLoading.value = false;
        }
      };
      
      // 加载用户列表
      const loadUsers = async () => {
        userLoading.value = true;
        const token = localStorage.getItem('admin_token');
        
        try {
          const params = new URLSearchParams({
            page: userPage.value,
            pageSize: userPageSize.value
          });
          
          if (userSearch.value) {
            params.append('search', userSearch.value);
          }
          
          if (userStatus.value) {
            params.append('status', userStatus.value);
          }
          
          const res = await fetch(`${API_BASE}/users?${params}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            users.value = data.users;
            userTotal.value = data.total;
            console.log('✅ 用户列表加载成功:', users.value.length, '个');
          }
        } catch (error) {
          console.error('加载用户列表失败:', error);
          ElementPlus.ElMessage.error('加载失败');
        } finally {
          userLoading.value = false;
        }
      };
      
      // 查看用户详情
      const viewUserDetail = (row) => {
        ElementPlus.ElMessage.info(`查看用户"${row.nickname}"详情 - 功能开发中`);
      };
      
      // 禁用用户
      const disableUser = async (row) => {
        try {
          await ElementPlus.ElMessageBox.confirm(
            `确定要禁用用户"${row.nickname}"吗？`,
            '禁用确认',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning'
            }
          );
        } catch {
          return;
        }
        
        const token = localStorage.getItem('admin_token');
        
        try {
          const res = await fetch(`${API_BASE}/users/${row.id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'banned' })
          });
          
          if (res.ok) {
            ElementPlus.ElMessage.success('用户已禁用');
            loadUsers();
          } else {
            const data = await res.json();
            ElementPlus.ElMessage.error(data.error || '操作失败');
          }
        } catch (error) {
          console.error('禁用用户失败:', error);
          ElementPlus.ElMessage.error('网络错误');
        }
      };
      
      // 启用用户
      const enableUser = async (row) => {
        const token = localStorage.getItem('admin_token');
        
        try {
          const res = await fetch(`${API_BASE}/users/${row.id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'active' })
          });
          
          if (res.ok) {
            ElementPlus.ElMessage.success('用户已启用');
            loadUsers();
          } else {
            const data = await res.json();
            ElementPlus.ElMessage.error(data.error || '操作失败');
          }
        } catch (error) {
          console.error('启用用户失败:', error);
          ElementPlus.ElMessage.error('网络错误');
        }
      };
      
      // 加载操作日志
      const loadLogs = async () => {
        logsLoading.value = true;
        const token = localStorage.getItem('admin_token');
        
        try {
          const res = await fetch(`${API_BASE}/logs?limit=50`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            logs.value = data.logs;
            console.log('✅ 日志加载成功:', logs.value.length, '条');
          }
        } catch (error) {
          console.error('加载日志失败:', error);
        } finally {
          logsLoading.value = false;
        }
      };
      
      // 加载错题本
      const loadMistakes = async () => {
        mistakesLoading.value = true;
        const token = localStorage.getItem('admin_token');
        
        try {
          const res = await fetch(`${API_BASE}/stats/mistakes?limit=50`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            mistakes.value = data.mistakes?.topMistakes || [];
            console.log('✅ 错题加载成功:', mistakes.value.length, '个');
          }
        } catch (error) {
          console.error('加载错题失败:', error);
        } finally {
          mistakesLoading.value = false;
        }
      };
      
      // 加载系统配置
      const loadConfig = async () => {
        const token = localStorage.getItem('admin_token');
        
        try {
          const res = await fetch(`${API_BASE}/config`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            Object.assign(config.learning, data.config.learning);
            Object.assign(config.reminder, data.config.reminder);
            Object.assign(config.system, data.config.system);
            console.log('✅ 配置加载成功');
          }
        } catch (error) {
          console.error('加载配置失败:', error);
        }
      };
      
      // 保存系统配置
      const saveConfig = async () => {
        const token = localStorage.getItem('admin_token');
        
        try {
          const res = await fetch(`${API_BASE}/config`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config)
          });
          
          if (res.ok) {
            ElementPlus.ElMessage.success('配置已保存');
          } else {
            const data = await res.json();
            ElementPlus.ElMessage.error(data.error || '保存失败');
          }
        } catch (error) {
          console.error('保存配置失败:', error);
          ElementPlus.ElMessage.error('网络错误');
        }
      };
      
      // 导出用户数据
      const exportUsers = () => {
        const token = localStorage.getItem('admin_token');
        const url = `${API_BASE}/export/users?format=${exportUserFormat.value}`;
        window.open(url, '_blank');
        ElementPlus.ElMessage.success('导出已开始');
      };
      
      // 导出词库数据
      const exportWordbooks = () => {
        const token = localStorage.getItem('admin_token');
        const url = `${API_BASE}/export/wordbooks?format=${exportWordFormat.value}`;
        window.open(url, '_blank');
        ElementPlus.ElMessage.success('导出已开始');
      };
      
      // 导出学习记录
      const exportLearning = () => {
        if (!exportLearningDate.value || exportLearningDate.value.length !== 2) {
          ElementPlus.ElMessage.warning('请选择日期范围');
          return;
        }
        
        const token = localStorage.getItem('admin_token');
        const startDate = exportLearningDate.value[0].toISOString().split('T')[0];
        const endDate = exportLearningDate.value[1].toISOString().split('T')[0];
        const url = `${API_BASE}/export/learning?startDate=${startDate}&endDate=${endDate}`;
        window.open(url, '_blank');
        ElementPlus.ElMessage.success('导出已开始');
      };
      
      // P1 功能 - 加载成就数据
      const loadAchievements = async () => {
        try {
          const token = localStorage.getItem('admin_token');
          if (!token) return;
          
          const [achievementsRes, statsRes] = await Promise.all([
            fetch(`${API_BASE}/achievements`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/achievements/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
          ]);
          
          if (achievementsRes.ok) {
            const data = await achievementsRes.json();
            achievements.value = data.achievements;
          }
          
          if (statsRes.ok) {
            const data = await statsRes.json();
            Object.assign(achievementStats, data.stats);
          }
        } catch (error) {
          console.error('加载成就数据失败:', error);
        }
      };
      
      // P1 功能 - 加载提醒配置
      const loadReminderConfig = async () => {
        try {
          const token = localStorage.getItem('admin_token');
          if (!token) return;
          
          const res = await fetch(`${API_BASE}/reminders`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            reminderConfig.enabled = data.config.enabled;
            reminderConfig.maxRemindersPerDay = data.config.maxRemindersPerDay;
            notificationTemplates.value = data.templates || [];
          }
        } catch (error) {
          console.error('加载提醒配置失败:', error);
        }
      };
      
      // P1 功能 - 保存提醒配置
      const saveReminderConfig = async () => {
        try {
          const token = localStorage.getItem('admin_token');
          if (!token) return;
          
          const res = await fetch(`${API_BASE}/reminders`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ config: reminderConfig })
          });
          
          if (res.ok) {
            ElementPlus.ElMessage.success('配置已保存');
          }
        } catch (error) {
          console.error('保存配置失败:', error);
          ElementPlus.ElMessage.error('保存失败');
        }
      };
      
      // P2 功能 - 加载异常检测
      const loadAnomalyDetection = async () => {
        anomalyLoading.value = true;
        try {
          const token = localStorage.getItem('admin_token');
          if (!token) return;
          
          const res = await fetch(`${API_BASE}/anomaly/detection?days=${anomalyDays.value}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            anomalyData.value = await res.json();
          }
        } catch (error) {
          console.error('加载异常检测失败:', error);
          ElementPlus.ElMessage.error('加载失败');
        } finally {
          anomalyLoading.value = false;
        }
      };
      
      // P2 功能 - 加载清理分析
      const loadCleanupAnalysis = async () => {
        try {
          const token = localStorage.getItem('admin_token');
          if (!token) return;
          
          const res = await fetch(`${API_BASE}/cleanup/analysis`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            cleanupAnalysis.value = await res.json();
          }
        } catch (error) {
          console.error('加载清理分析失败:', error);
        }
      };
      
      // P2 功能 - 清理僵尸用户
      const cleanupZombieUsers = async () => {
        try {
          await ElementPlus.ElMessageBox.confirm('确定要清理僵尸用户吗？此操作不可恢复！', '确认清理', { type: 'warning' });
          
          const token = localStorage.getItem('admin_token');
          cleanupLoading.value = true;
          
          const res = await fetch(`${API_BASE}/cleanup/zombie-users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ confirm: true })
          });
          
          if (res.ok) {
            const data = await res.json();
            ElementPlus.ElMessage.success(data.message);
            loadCleanupAnalysis();
          }
        } catch (error) {
          if (error !== 'cancel') {
            console.error('清理失败:', error);
            ElementPlus.ElMessage.error('清理失败');
          }
        } finally {
          cleanupLoading.value = false;
        }
      };
      
      // P2 功能 - 清理无效记录
      const cleanupOrphanedRecords = async () => {
        try {
          await ElementPlus.ElMessageBox.confirm('确定要清理无效记录吗？', '确认清理', { type: 'warning' });
          
          const token = localStorage.getItem('admin_token');
          cleanupLoading.value = true;
          
          const res = await fetch(`${API_BASE}/cleanup/orphaned-records`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ confirm: true })
          });
          
          if (res.ok) {
            const data = await res.json();
            ElementPlus.ElMessage.success(data.message);
            loadCleanupAnalysis();
          }
        } catch (error) {
          if (error !== 'cancel') {
            ElementPlus.ElMessage.error('清理失败');
          }
        } finally {
          cleanupLoading.value = false;
        }
      };
      
      // P2 功能 - 清理过期会话
      const cleanupOldSessions = async () => {
        try {
          await ElementPlus.ElMessageBox.confirm('确定要清理过期会话吗？', '确认清理', { type: 'warning' });
          
          const token = localStorage.getItem('admin_token');
          cleanupLoading.value = true;
          
          const res = await fetch(`${API_BASE}/cleanup/old-sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ confirm: true, days: 90 })
          });
          
          if (res.ok) {
            const data = await res.json();
            ElementPlus.ElMessage.success(data.message);
            loadCleanupAnalysis();
          }
        } catch (error) {
          if (error !== 'cancel') {
            ElementPlus.ElMessage.error('清理失败');
          }
        } finally {
          cleanupLoading.value = false;
        }
      };
      
      // P2 功能 - 数据库优化
      const vacuumDatabase = async () => {
        try {
          await ElementPlus.ElMessageBox.confirm('执行 VACUUM 优化可能需要较长时间，确定继续？', '确认优化', { type: 'warning' });
          
          const token = localStorage.getItem('admin_token');
          cleanupLoading.value = true;
          
          const res = await fetch(`${API_BASE}/cleanup/vacuum`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            ElementPlus.ElMessage.success(`优化完成！数据库大小：${data.dbSize}`);
            loadCleanupAnalysis();
          }
        } catch (error) {
          if (error !== 'cancel') {
            ElementPlus.ElMessage.error('优化失败');
          }
        } finally {
          cleanupLoading.value = false;
        }
      };
      
      // 查看单词详情
      const viewWordDetail = (row) => {
        ElementPlus.ElMessage.info(`查看单词"${row.word}"详情 - 功能开发中`);
      };
      
      // 菜单切换
      watch(currentMenu, (newMenu) => {
        if (newMenu === 'dashboard') {
          loadDashboard();
        } else if (newMenu === 'wordbooks') {
          loadWordbooks();
        } else if (newMenu === 'users') {
          loadUsers();
        } else if (newMenu === 'logs') {
          loadLogs();
        } else if (newMenu === 'mistakes') {
          loadMistakes();
        } else if (newMenu === 'config') {
          loadConfig();
        } else if (newMenu === 'achievements') {
          loadAchievements();
        } else if (newMenu === 'reminders') {
          loadReminderConfig();
        } else if (newMenu === 'anomaly') {
          loadAnomalyDetection();
        } else if (newMenu === 'cleanup') {
          loadCleanupAnalysis();
        }
      });
      
      // 初始化
      onMounted(() => {
        console.log(' Vue 组件已挂载');
        checkLogin();
        // 预加载 P1/P2 功能数据
        loadAchievements();
        loadReminderConfig();
        loadCleanupAnalysis();
      });
      
      return {
        isLoggedIn,
        loginLoading,
        adminInfo,
        loginForm,
        loginRules,
        currentMenu,
        menuTitle,
        stats,
        wordbookLoading,
        wordbooks,
        wordbookPage,
        wordbookPageSize,
        wordbookTotal,
        wordbookSearch,
        wordbookDialogVisible,
        isEditWordbook,
        wordbookForm,
        userLoading,
        users,
        userPage,
        userPageSize,
        userTotal,
        userSearch,
        userStatus,
        logsLoading,
        logs,
        mistakesLoading,
        mistakes,
        config,
        exportUserFormat,
        exportWordFormat,
        exportLearningDate,
        achievements,
        achievementStats,
        reminderConfig,
        notificationTemplates,
        anomalyDays,
        anomalyLoading,
        anomalyData,
        cleanupAnalysis,
        cleanupLoading,
        handleLogin,
        handleCommand,
        loadWordbooks,
        showCreateWordbookDialog,
        editWordbook,
        saveWordbook,
        deleteWordbook,
        viewWordbookWords,
        loadUsers,
        viewUserDetail,
        disableUser,
        enableUser,
        viewWordDetail,
        loadConfig,
        saveConfig,
        exportUsers,
        exportWordbooks,
        exportLearning,
        viewWordbookWords,
        loadWordbookWords,
        loadAchievements,
        loadReminderConfig,
        saveReminderConfig,
        loadAnomalyDetection,
        loadCleanupAnalysis,
        cleanupZombieUsers,
        cleanupOrphanedRecords,
        cleanupOldSessions,
        vacuumDatabase,
        wordListDialogVisible,
        currentWordbook,
        wordList,
        wordListLoading,
        wordListPage,
        wordListPageSize,
        wordListTotal,
        wordSearch
      };
    }
  });
  
  // 注册 Element Plus 图标
  if (typeof ElementPlusIconsVue !== 'undefined') {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(key, component);
    }
    console.log('✅ Element Plus Icons 已注册');
  } else {
    console.warn('⚠️ Element Plus Icons 未加载');
  }
  
  // 使用 Element Plus
  app.use(ElementPlus);
  console.log('✅ Element Plus 已使用');
  
  // 挂载应用
  try {
    app.mount('#app');
    console.log('✅ 管理后台 Vue 应用已启动');
  } catch (error) {
    console.error('❌ Vue 挂载失败:', error);
  }
})();

console.log('📝 admin.js 已加载');

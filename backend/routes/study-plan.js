/**
 * 学习计划模块路由
 * AIielts Phase 1 - 学习计划系统
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../ielts_vocab.db');
const db = new sqlite3.Database(dbPath);

const authMiddleware = require('../auth-middleware');

/**
 * POST /api/study-plan/create
 * 创建学习计划
 */
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            examDate,
            targetScore,
            currentScore,
            dailyStudyHours,
            weakSkills
        } = req.body;
        
        if (!examDate || !targetScore) {
            return res.status(400).json({ error: '考试日期和目标分数为必填项' });
        }
        
        // 计算学习周期
        const startDate = new Date();
        const endDate = new Date(examDate);
        const totalWeeks = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7));
        
        // 创建或更新用户目标
        db.run(
            `INSERT INTO user_goals (user_id, exam_date, target_score, current_score, daily_study_hours, weak_skills) 
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET 
                exam_date = ?, target_score = ?, current_score = ?, daily_study_hours = ?, weak_skills = ?, updated_at = CURRENT_TIMESTAMP`,
            [userId, examDate, targetScore, currentScore || 5.5, dailyStudyHours || 2.0, JSON.stringify(weakSkills || []),
             examDate, targetScore, currentScore || 5.5, dailyStudyHours || 2.0, JSON.stringify(weakSkills || [])],
            function(err) {
                if (err) {
                    console.error('保存用户目标失败:', err);
                    return res.status(500).json({ error: '保存用户目标失败' });
                }
                
                // 创建学习计划
                const planName = `雅思备考计划 (${targetScore}分)`;
                
                db.run(
                    `INSERT INTO study_plans (user_id, plan_name, exam_date, target_score, current_score, start_date, end_date, total_weeks, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
                    [userId, planName, examDate, targetScore, currentScore || 5.5, startDate.toISOString().split('T')[0], examDate, totalWeeks],
                    function(err) {
                        if (err) {
                            console.error('创建学习计划失败:', err);
                            return res.status(500).json({ error: '创建学习计划失败' });
                        }
                        
                        const planId = this.lastID;
                        
                        // TODO: AI 生成每日任务
                        // 这里先创建示例任务
                        generatePlanTasks(planId, totalWeeks, weakSkills, (err) => {
                            if (err) {
                                console.error('生成任务失败:', err);
                            }
                            
                            res.json({
                                success: true,
                                data: {
                                    planId,
                                    planName,
                                    totalWeeks,
                                    message: '学习计划创建成功，AI 正在生成每日任务...'
                                }
                            });
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('创建学习计划异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 生成计划任务的辅助函数
function generatePlanTasks(planId, totalWeeks, weakSkills, callback) {
    const tasks = [];
    const startDate = new Date();
    
    // 简化版：每周创建示例任务
    for (let week = 1; week <= totalWeeks; week++) {
        for (let day = 1; day <= 7; day++) {
            const taskDate = new Date(startDate);
            taskDate.setDate(startDate.getDate() + (week - 1) * 7 + (day - 1));
            
            // 每天的基础任务
            tasks.push({
                plan_id: planId,
                task_date: taskDate.toISOString().split('T')[0],
                week_number: week,
                day_number: day,
                task_type: 'vocabulary',
                task_content: '背诵 50 个雅思核心词汇',
                estimated_duration: 30
            });
            
            // 根据薄弱项添加专项训练
            if (weakSkills && weakSkills.includes('reading')) {
                tasks.push({
                    plan_id: planId,
                    task_date: taskDate.toISOString().split('T')[0],
                    week_number: week,
                    day_number: day,
                    task_type: 'reading',
                    task_content: '完成 1 篇阅读文章并精读分析',
                    estimated_duration: 60
                });
            }
            
            if (weakSkills && weakSkills.includes('listening')) {
                tasks.push({
                    plan_id: planId,
                    task_date: taskDate.toISOString().split('T')[0],
                    week_number: week,
                    day_number: day,
                    task_type: 'listening',
                    task_content: '完成 1 个听力场景训练',
                    estimated_duration: 45
                });
            }
        }
    }
    
    // 批量插入任务
    const stmt = db.prepare(`
        INSERT INTO study_plan_tasks (plan_id, task_date, week_number, day_number, task_type, task_content, estimated_duration)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    tasks.forEach(task => {
        stmt.run(task.plan_id, task.task_date, task.week_number, task.day_number, task.task_type, task.task_content, task.estimated_duration);
    });
    
    stmt.finalize((err) => {
        callback(err);
    });
}

/**
 * GET /api/study-plan/:userId
 * 获取用户学习计划
 */
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        
        db.get('SELECT * FROM study_plans WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1', 
            [userId, 'active'],
            (err, plan) => {
                if (err) {
                    console.error('获取学习计划失败:', err);
                    return res.status(500).json({ error: '获取学习计划失败' });
                }
                
                if (!plan) {
                    return res.json({
                        success: true,
                        data: null,
                        message: '暂无活跃的学习计划'
                    });
                }
                
                res.json({
                    success: true,
                    data: plan
                });
            }
        );
    } catch (error) {
        console.error('获取学习计划异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/study-plan/:userId/today
 * 获取今日任务
 */
router.get('/:userId/today', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        const today = new Date().toISOString().split('T')[0];
        
        db.all(
            `SELECT spt.*, sp.plan_name 
             FROM study_plan_tasks spt
             JOIN study_plans sp ON spt.plan_id = sp.id
             WHERE sp.user_id = ? AND spt.task_date = ?
             ORDER BY spt.task_type`,
            [userId, today],
            (err, tasks) => {
                if (err) {
                    console.error('获取今日任务失败:', err);
                    return res.status(500).json({ error: '获取今日任务失败' });
                }
                
                res.json({
                    success: true,
                    data: {
                        date: today,
                        tasks,
                        total: tasks.length,
                        completed: tasks.filter(t => t.status === 'completed').length
                    }
                });
            }
        );
    } catch (error) {
        console.error('获取今日任务异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * POST /api/study-plan/:planId/task/complete
 * 完成任务
 */
router.post('/:planId/task/complete', authMiddleware, async (req, res) => {
    try {
        const planId = req.params.planId;
        const { taskId, taskDate, taskType } = req.body;
        
        db.run(
            `UPDATE study_plan_tasks 
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND plan_id = ?`,
            [taskId, planId],
            (err) => {
                if (err) {
                    console.error('更新任务状态失败:', err);
                    return res.status(500).json({ error: '更新任务状态失败' });
                }
                
                // 记录进度
                const today = taskDate || new Date().toISOString().split('T')[0];
                
                db.run(
                    `INSERT INTO study_plan_progress (plan_id, record_date, completed_tasks, total_tasks, completion_rate)
                     SELECT ?, ?, 
                            COUNT(CASE WHEN status = 'completed' THEN 1 END),
                            COUNT(*),
                            CAST(COUNT(CASE WHEN status = 'completed' THEN 1 END) AS FLOAT) / COUNT(*) * 100
                     FROM study_plan_tasks 
                     WHERE plan_id = ? AND task_date = ?
                     ON CONFLICT(plan_id, record_date) DO UPDATE SET
                        completed_tasks = excluded.completed_tasks,
                        total_tasks = excluded.total_tasks,
                        completion_rate = excluded.completion_rate`,
                    [planId, today, planId, today],
                    (err) => {
                        if (err) {
                            console.error('记录进度失败:', err);
                        }
                        
                        res.json({
                            success: true,
                            message: '任务已完成，继续加油！'
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('完成任务异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/study-plan/:userId/progress
 * 获取学习进度
 */
router.get('/:userId/progress', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        
        db.get(
            `SELECT sp.*, 
                    COUNT(spt.id) as total_tasks,
                    COUNT(CASE WHEN spt.status = 'completed' THEN 1 END) as completed_tasks,
                    AVG(spp.completion_rate) as avg_completion_rate
             FROM study_plans sp
             LEFT JOIN study_plan_tasks spt ON sp.id = spt.plan_id
             LEFT JOIN study_plan_progress spp ON sp.id = spp.plan_id
             WHERE sp.user_id = ? AND sp.status = 'active'
             GROUP BY sp.id`,
            [userId],
            (err, progress) => {
                if (err) {
                    console.error('获取进度失败:', err);
                    return res.status(500).json({ error: '获取进度失败' });
                }
                
                res.json({
                    success: true,
                    data: progress || null
                });
            }
        );
    } catch (error) {
        console.error('获取进度异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * POST /api/diagnostic/create
 * 创建诊断测试
 */
router.post('/diagnostic/create', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { testType, scores } = req.body;
        
        db.run(
            `INSERT INTO diagnostic_tests (user_id, test_type, overall_score, reading_score, listening_score, writing_score, speaking_score, test_result)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, testType, scores.overall, scores.reading, scores.listening, scores.writing, scores.speaking, JSON.stringify(scores)],
            function(err) {
                if (err) {
                    console.error('保存诊断测试失败:', err);
                    return res.status(500).json({ error: '保存诊断测试失败' });
                }
                
                // 更新用户目标的当前水平
                db.run(
                    `UPDATE user_goals SET current_score = ? WHERE user_id = ?`,
                    [scores.overall, userId],
                    (err) => {
                        if (err) {
                            console.error('更新用户目标失败:', err);
                        }
                        
                        res.json({
                            success: true,
                            data: {
                                testId: this.lastID,
                                message: '诊断测试已完成'
                            }
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('诊断测试异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;

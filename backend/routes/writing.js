/**
 * 写作模块路由
 * AIielts Phase 1 - 写作智能批改
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../ielts_vocab.db');
const db = new sqlite3.Database(dbPath);

const authMiddleware = require('../auth-middleware');

/**
 * GET /api/writing/tasks
 * 获取写作任务列表
 */
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const { taskType, category } = req.query;
        
        let query = 'SELECT * FROM writing_tasks WHERE 1=1';
        const params = [];
        
        if (taskType) {
            query += ' AND task_type = ?';
            params.push(taskType);
        }
        
        if (category) {
            query += ' AND task_category = ?';
            params.push(category);
        }
        
        query += ' ORDER BY created_at DESC LIMIT 20';
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('获取写作任务失败:', err);
                return res.status(500).json({ error: '获取写作任务失败' });
            }
            
            res.json({
                success: true,
                data: rows
            });
        });
    } catch (error) {
        console.error('获取写作任务异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * POST /api/writing/submit
 * 提交作文
 */
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { taskId, essayText, timeSpent } = req.body;
        
        if (!taskId || !essayText) {
            return res.status(400).json({ error: '任务 ID 和作文内容为必填项' });
        }
        
        // 计算字数
        const wordCount = essayText.split(/\s+/).filter(w => w.length > 0).length;
        
        db.run(
            `INSERT INTO writing_submissions (user_id, task_id, essay_text, word_count, time_spent)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, taskId, essayText, wordCount, timeSpent || 0],
            function(err) {
                if (err) {
                    console.error('提交作文失败:', err);
                    return res.status(500).json({ error: '提交作文失败' });
                }
                
                const submissionId = this.lastID;
                
                // TODO: 调用 AI 服务进行批改
                // 这里先返回成功，后续集成 AI 批改
                
                res.json({
                    success: true,
                    data: {
                        submissionId,
                        wordCount,
                        message: '作文已提交，AI 正在批改中...'
                    }
                });
            }
        );
    } catch (error) {
        console.error('提交作文异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/writing/feedback/:submissionId
 * 获取 AI 批改反馈
 */
router.get('/feedback/:submissionId', authMiddleware, async (req, res) => {
    try {
        const submissionId = req.params.submissionId;
        const userId = req.user.id;
        
        db.get(
            `SELECT ws.*, wf.* 
             FROM writing_submissions ws
             LEFT JOIN writing_feedback wf ON ws.id = wf.submission_id
             WHERE ws.id = ? AND ws.user_id = ?`,
            [submissionId, userId],
            (err, row) => {
                if (err) {
                    console.error('获取批改反馈失败:', err);
                    return res.status(500).json({ error: '获取批改反馈失败' });
                }
                
                if (!row) {
                    return res.status(404).json({ error: '未找到作文记录' });
                }
                
                res.json({
                    success: true,
                    data: {
                        submission: {
                            id: row.id,
                            essayText: row.essay_text,
                            wordCount: row.word_count,
                            submissionTime: row.submission_time,
                            timeSpent: row.time_spent
                        },
                        feedback: row.overall_score ? {
                            overallScore: row.overall_score,
                            taskResponseScore: row.task_response_score,
                            coherenceScore: row.coherence_score,
                            vocabularyScore: row.vocabulary_score,
                            grammarScore: row.grammar_score,
                            aiFeedback: row.ai_feedback,
                            aiSuggestions: row.ai_suggestions ? JSON.parse(row.ai_suggestions) : null,
                            correctedEssay: row.corrected_essay
                        } : null
                    }
                });
            }
        );
    } catch (error) {
        console.error('获取批改反馈异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/writing/history
 * 获取历史作文
 */
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;
        
        db.all(
            `SELECT ws.*, wt.task_type, wt.task_category,
                    wf.overall_score
             FROM writing_submissions ws
             JOIN writing_tasks wt ON ws.task_id = wt.id
             LEFT JOIN writing_feedback wf ON ws.id = wf.submission_id
             WHERE ws.user_id = ?
             ORDER BY ws.submission_time DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)],
            (err, rows) => {
                if (err) {
                    console.error('获取历史作文失败:', err);
                    return res.status(500).json({ error: '获取历史作文失败' });
                }
                
                res.json({
                    success: true,
                    data: rows,
                    total: rows.length
                });
            }
        );
    } catch (error) {
        console.error('获取历史作文异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/writing/progress
 * 获取写作进步曲线
 */
router.get('/progress', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        db.all(
            `SELECT ws.submission_time, wf.overall_score, wf.task_response_score, wf.coherence_score, wf.vocabulary_score, wf.grammar_score
             FROM writing_submissions ws
             JOIN writing_feedback wf ON ws.id = wf.submission_id
             WHERE ws.user_id = ? AND wf.overall_score IS NOT NULL
             ORDER BY ws.submission_time ASC`,
            [userId],
            (err, rows) => {
                if (err) {
                    console.error('获取进步曲线失败:', err);
                    return res.status(500).json({ error: '获取进步曲线失败' });
                }
                
                res.json({
                    success: true,
                    data: {
                        scores: rows.map(r => ({
                            date: r.submission_time,
                            overall: r.overall_score,
                            taskResponse: r.task_response_score,
                            coherence: r.coherence_score,
                            vocabulary: r.vocabulary_score,
                            grammar: r.grammar_score
                        }))
                    }
                });
            }
        );
    } catch (error) {
        console.error('获取进步曲线异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;

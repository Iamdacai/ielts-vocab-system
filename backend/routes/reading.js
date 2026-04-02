/**
 * 阅读练习模块路由
 * AIielts Phase 1 - 阅读模块
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库连接
const dbPath = path.join(__dirname, '../ielts_vocab.db');
const db = new sqlite3.Database(dbPath);

// 认证中间件
const authMiddleware = require('../auth-middleware');

/**
 * GET /api/reading/articles
 * 获取阅读文章列表
 * 查询参数：category, difficulty, limit, offset
 */
router.get('/articles', authMiddleware, async (req, res) => {
    try {
        const { category, difficulty, limit = 20, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM reading_articles WHERE 1=1';
        const params = [];
        
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        if (difficulty) {
            query += ' AND difficulty = ?';
            params.push(difficulty);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('获取文章列表失败:', err);
                return res.status(500).json({ error: '获取文章列表失败' });
            }
            
            res.json({
                success: true,
                data: rows,
                total: rows.length
            });
        });
    } catch (error) {
        console.error('获取文章列表异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/reading/articles/:id
 * 获取文章详情（包含题目）
 */
router.get('/articles/:id', authMiddleware, async (req, res) => {
    try {
        const articleId = req.params.id;
        
        // 获取文章详情
        db.get('SELECT * FROM reading_articles WHERE id = ?', [articleId], (err, article) => {
            if (err) {
                console.error('获取文章详情失败:', err);
                return res.status(500).json({ error: '获取文章详情失败' });
            }
            
            if (!article) {
                return res.status(404).json({ error: '文章不存在' });
            }
            
            // 获取题目
            db.all('SELECT * FROM reading_questions WHERE article_id = ? ORDER BY question_number', [articleId], (err, questions) => {
                if (err) {
                    console.error('获取题目失败:', err);
                    return res.status(500).json({ error: '获取题目失败' });
                }
                
                res.json({
                    success: true,
                    data: {
                        ...article,
                        questions
                    }
                });
            });
        });
    } catch (error) {
        console.error('获取文章详情异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * POST /api/reading/articles/:id/submit
 * 提交阅读答案
 */
router.post('/articles/:id/submit', authMiddleware, async (req, res) => {
    try {
        const articleId = req.params.id;
        const userId = req.user.id;
        const { answers } = req.body; // [{questionId, answer, timeSpent}]
        
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: '答案格式错误' });
        }
        
        const results = [];
        let correctCount = 0;
        
        // 处理每个答案
        for (const ans of answers) {
            const { questionId, answer, timeSpent } = ans;
            
            // 获取正确答案
            await new Promise((resolve, reject) => {
                db.get('SELECT correct_answer FROM reading_questions WHERE id = ?', [questionId], (err, question) => {
                    if (err) reject(err);
                    
                    const isCorrect = question && question.correct_answer === answer;
                    if (isCorrect) correctCount++;
                    
                    // 保存用户答案
                    db.run(
                        'INSERT INTO reading_user_answers (user_id, article_id, question_id, user_answer, is_correct, time_spent) VALUES (?, ?, ?, ?, ?, ?)',
                        [userId, articleId, questionId, answer, isCorrect, timeSpent || 0],
                        (err) => {
                            if (err) reject(err);
                            
                            results.push({
                                questionId,
                                userAnswer: answer,
                                correctAnswer: question ? question.correct_answer : null,
                                isCorrect,
                                timeSpent
                            });
                            
                            resolve();
                        }
                    );
                });
            });
        }
        
        // 计算得分
        const score = Math.round((correctCount / answers.length) * 100);
        
        res.json({
            success: true,
            data: {
                score,
                correctCount,
                totalCount: answers.length,
                results
            }
        });
    } catch (error) {
        console.error('提交答案异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/reading/analysis/:articleId
 * 获取 AI 解析
 */
router.get('/analysis/:articleId', authMiddleware, async (req, res) => {
    try {
        const articleId = req.params.articleId;
        const userId = req.user.id;
        
        // 获取用户的答题记录
        db.all(
            `SELECT rqa.*, rq.question_text, rq.correct_answer, rq.ai_explanation 
             FROM reading_user_answers rqa 
             JOIN reading_questions rq ON rqa.question_id = rq.id 
             WHERE rqa.user_id = ? AND rqa.article_id = ?`,
            [userId, articleId],
            (err, answers) => {
                if (err) {
                    console.error('获取解析失败:', err);
                    return res.status(500).json({ error: '获取解析失败' });
                }
                
                if (answers.length === 0) {
                    return res.status(404).json({ error: '未找到答题记录' });
                }
                
                res.json({
                    success: true,
                    data: {
                        articleId,
                        answers: answers.map(a => ({
                            questionId: a.question_id,
                            questionText: a.question_text,
                            userAnswer: a.user_answer,
                            correctAnswer: a.correct_answer,
                            isCorrect: a.is_correct === 1,
                            explanation: a.ai_explanation
                        }))
                    }
                });
            }
        );
    } catch (error) {
        console.error('获取解析异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * POST /api/reading/practice
 * 智能推荐练习
 */
router.post('/practice', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { weakTypes, targetDifficulty } = req.body;
        
        // 根据用户薄弱项推荐文章
        let query = `
            SELECT ra.*, 
                   COUNT(rua.id) as practiced_count,
                   AVG(CASE WHEN rua.is_correct = 1 THEN 1.0 ELSE 0.0 END) as accuracy
            FROM reading_articles ra
            LEFT JOIN reading_questions rq ON ra.id = rq.article_id
            LEFT JOIN reading_user_answers rua ON rq.id = rua.question_id AND rua.user_id = ?
            WHERE 1=1
        `;
        
        const params = [userId];
        
        if (targetDifficulty) {
            query += ' AND ra.difficulty = ?';
            params.push(targetDifficulty);
        }
        
        query += `
            GROUP BY ra.id 
            ORDER BY practiced_count ASC, accuracy ASC, ra.created_at DESC 
            LIMIT 5
        `;
        
        db.all(query, params, (err, articles) => {
            if (err) {
                console.error('推荐练习失败:', err);
                return res.status(500).json({ error: '推荐练习失败' });
            }
            
            res.json({
                success: true,
                data: {
                    recommendations: articles,
                    reason: weakTypes ? `针对您的薄弱项：${weakTypes.join(', ')}` : '基于您的学习进度推荐'
                }
            });
        });
    } catch (error) {
        console.error('推荐练习异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/reading/skill-analysis
 * 获取用户阅读能力诊断
 */
router.get('/skill-analysis', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 获取最新的能力诊断
        db.get(
            'SELECT * FROM reading_skill_analysis WHERE user_id = ? ORDER BY analysis_date DESC LIMIT 1',
            [userId],
            (err, analysis) => {
                if (err) {
                    console.error('获取能力诊断失败:', err);
                    return res.status(500).json({ error: '获取能力诊断失败' });
                }
                
                res.json({
                    success: true,
                    data: analysis || null
                });
            }
        );
    } catch (error) {
        console.error('获取能力诊断异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;

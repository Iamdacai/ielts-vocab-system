/**
 * 听力练习模块路由
 * AIielts Phase 1 - 听力模块
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
 * GET /api/listening/tests
 * 获取听力测试列表
 */
router.get('/tests', authMiddleware, async (req, res) => {
    try {
        const { category, difficulty, limit = 20, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM listening_tests WHERE 1=1';
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
                console.error('获取听力测试列表失败:', err);
                return res.status(500).json({ error: '获取听力测试列表失败' });
            }
            
            res.json({
                success: true,
                data: rows,
                total: rows.length
            });
        });
    } catch (error) {
        console.error('获取听力测试列表异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/listening/tests/:id
 * 获取听力测试详情（包含题目）
 */
router.get('/tests/:id', authMiddleware, async (req, res) => {
    try {
        const testId = req.params.id;
        
        db.get('SELECT * FROM listening_tests WHERE id = ?', [testId], (err, test) => {
            if (err) {
                console.error('获取测试详情失败:', err);
                return res.status(500).json({ error: '获取测试详情失败' });
            }
            
            if (!test) {
                return res.status(404).json({ error: '测试不存在' });
            }
            
            db.all('SELECT * FROM listening_questions WHERE test_id = ? ORDER BY section_number, question_number', [testId], (err, questions) => {
                if (err) {
                    console.error('获取题目失败:', err);
                    return res.status(500).json({ error: '获取题目失败' });
                }
                
                res.json({
                    success: true,
                    data: {
                        ...test,
                        questions
                    }
                });
            });
        });
    } catch (error) {
        console.error('获取测试详情异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * POST /api/listening/tests/:id/submit
 * 提交听力答案
 */
router.post('/tests/:id/submit', authMiddleware, async (req, res) => {
    try {
        const testId = req.params.id;
        const userId = req.user.id;
        const { answers } = req.body;
        
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: '答案格式错误' });
        }
        
        const results = [];
        let correctCount = 0;
        
        for (const ans of answers) {
            const { questionId, answer, timeSpent } = ans;
            
            await new Promise((resolve, reject) => {
                db.get('SELECT correct_answer FROM listening_questions WHERE id = ?', [questionId], (err, question) => {
                    if (err) reject(err);
                    
                    const isCorrect = question && question.correct_answer === answer;
                    if (isCorrect) correctCount++;
                    
                    db.run(
                        'INSERT INTO listening_user_answers (user_id, test_id, question_id, user_answer, is_correct, time_spent) VALUES (?, ?, ?, ?, ?, ?)',
                        [userId, testId, questionId, answer, isCorrect, timeSpent || 0],
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
 * POST /api/listening/dictation
 * 听写训练提交
 */
router.post('/dictation', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { text, audioUrl, accuracy } = req.body;
        
        // 这里可以集成 AI 评分
        res.json({
            success: true,
            data: {
                accuracy,
                feedback: '听写完成，继续加油！'
            }
        });
    } catch (error) {
        console.error('听写训练异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * GET /api/listening/recommend
 * 智能推荐听力练习
 */
router.get('/recommend', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const query = `
            SELECT lt.*, 
                   COUNT(lua.id) as practiced_count,
                   AVG(CASE WHEN lua.is_correct = 1 THEN 1.0 ELSE 0.0 END) as accuracy
            FROM listening_tests lt
            LEFT JOIN listening_questions lq ON lt.id = lq.test_id
            LEFT JOIN listening_user_answers lua ON lq.id = lua.question_id AND lua.user_id = ?
            WHERE 1=1
            GROUP BY lt.id 
            ORDER BY practiced_count ASC, accuracy ASC, lt.created_at DESC 
            LIMIT 5
        `;
        
        db.all(query, [userId], (err, tests) => {
            if (err) {
                console.error('推荐练习失败:', err);
                return res.status(500).json({ error: '推荐练习失败' });
            }
            
            res.json({
                success: true,
                data: {
                    recommendations: tests
                }
            });
        });
    } catch (error) {
        console.error('推荐练习异常:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;

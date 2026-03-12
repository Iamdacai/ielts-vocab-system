// 错题本 2.0 控制器
// 功能：错题管理、智能推送、统计分析

const db = require('../database');

/**
 * 添加错题
 * POST /api/mistakes/add
 */
async function addMistake(req, res) {
    const { word_id, error_type } = req.body;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({ error: '未登录' });
    }
    
    if (!word_id || !error_type) {
        return res.status(400).json({ error: '参数不完整' });
    }
    
    const validErrorTypes = ['spelling', 'recognition', 'pronunciation', 'usage', 'listening'];
    if (!validErrorTypes.includes(error_type)) {
        return res.status(400).json({ error: '错误类型无效' });
    }
    
    try {
        // 调用数据库函数添加错题
        const result = await db.query(
            'SELECT add_mistake($1, $2, $3) as mistake_id',
            [user_id, word_id, error_type]
        );
        
        const mistake_id = result.rows[0].mistake_id;
        
        res.json({
            success: true,
            mistake_id,
            message: '已添加到错题本'
        });
    } catch (error) {
        console.error('添加错题失败:', error);
        res.status(500).json({ error: '添加错题失败' });
    }
}

/**
 * 获取错题列表
 * GET /api/mistakes/list
 */
async function getMistakes(req, res) {
    const user_id = req.user?.id;
    const { 
        page = 1, 
        limit = 20, 
        error_type, 
        high_frequency_only,
        active_only 
    } = req.query;
    
    if (!user_id) {
        return res.status(401).json({ error: '未登录' });
    }
    
    try {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE mb.user_id = $1';
        let queryParams = [user_id];
        let paramIndex = 2;
        
        if (error_type) {
            whereClause += ` AND mb.error_type = $${paramIndex}`;
            queryParams.push(error_type);
            paramIndex++;
        }
        
        if (high_frequency_only === 'true') {
            whereClause += ` AND mb.is_high_frequency = TRUE`;
        }
        
        if (active_only === 'true') {
            whereClause += ` AND mb.eliminated_at IS NULL`;
        }
        
        // 获取错题列表
        const mistakesQuery = `
            SELECT 
                mb.id,
                mb.word_id,
                mb.error_type,
                mb.error_count,
                mb.mastery_level,
                mb.is_high_frequency,
                mb.last_error_at,
                mb.eliminated_at,
                iw.word,
                iw.phonetic,
                iw.part_of_speech,
                iw.definition,
                iw.example_sentences
            FROM mistake_book mb
            JOIN ielts_words iw ON mb.word_id = iw.id
            ${whereClause}
            ORDER BY 
                mb.eliminated_at ASC NULLS FIRST,
                mb.is_high_frequency DESC,
                mb.error_count DESC,
                mb.last_error_at ASC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const mistakesResult = await db.query(mistakesQuery, queryParams);
        
        // 获取总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM mistake_book mb
            ${whereClause}
        `;
        
        const countResult = await db.query(countQuery, queryParams.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            success: true,
            data: mistakesResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取错题列表失败:', error);
        res.status(500).json({ error: '获取错题列表失败' });
    }
}

/**
 * 获取错题统计
 * GET /api/mistakes/stats
 */
async function getMistakeStats(req, res) {
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({ error: '未登录' });
    }
    
    try {
        // 总体统计
        const statsQuery = `SELECT * FROM user_mistake_stats WHERE user_id = $1`;
        const statsResult = await db.query(statsQuery, [user_id]);
        
        // 错误类型分布
        const typeQuery = `
            SELECT 
                error_type,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE eliminated_at IS NULL) as active_count
            FROM mistake_book
            WHERE user_id = $1
            GROUP BY error_type
            ORDER BY count DESC
        `;
        const typeResult = await db.query(typeQuery, [user_id]);
        
        // 今日新增
        const todayQuery = `
            SELECT COUNT(*) as today_count
            FROM mistake_book
            WHERE user_id = $1
            AND DATE(created_at) = CURRENT_DATE
        `;
        const todayResult = await db.query(todayQuery, [user_id]);
        
        // 高频错题 TOP10
        const topQuery = `
            SELECT 
                mb.id,
                mb.word_id,
                mb.error_count,
                iw.word,
                iw.definition
            FROM mistake_book mb
            JOIN ielts_words iw ON mb.word_id = iw.id
            WHERE mb.user_id = $1
              AND mb.is_high_frequency = TRUE
              AND mb.eliminated_at IS NULL
            ORDER BY mb.error_count DESC, mb.last_error_at ASC
            LIMIT 10
        `;
        const topResult = await db.query(topQuery, [user_id]);
        
        res.json({
            success: true,
            data: {
                overview: statsResult.rows[0] || {
                    total_mistakes: 0,
                    high_frequency_count: 0,
                    active_mistakes: 0,
                    eliminated_count: 0,
                    avg_error_count: 0,
                    max_error_count: 0
                },
                errorTypes: typeResult.rows,
                todayCount: todayResult.rows[0]?.today_count || 0,
                topHighFrequency: topResult.rows
            }
        });
    } catch (error) {
        console.error('获取错题统计失败:', error);
        res.status(500).json({ error: '获取错题统计失败' });
    }
}

/**
 * 错题练习（记录练习结果）
 * POST /api/mistakes/practice
 */
async function practiceMistake(req, res) {
    const { mistake_id, is_correct, response_time, practice_type } = req.body;
    const user_id = req.user?.id;
    
    if (!user_id || !mistake_id) {
        return res.status(400).json({ error: '参数不完整' });
    }
    
    try {
        // 记录练习
        await db.query(
            `INSERT INTO mistake_practice_records (user_id, mistake_id, is_correct, response_time, practice_type)
             VALUES ($1, $2, $3, $4, $5)`,
            [user_id, mistake_id, is_correct, response_time, practice_type || 'recognition']
        );
        
        // 如果正确，检查是否可以消除
        if (is_correct) {
            const eliminateResult = await db.query(
                'SELECT eliminate_mistake($1, (SELECT word_id FROM mistake_book WHERE id = $2)) as eliminated',
                [user_id, mistake_id]
            );
            
            const eliminated = eliminateResult.rows[0]?.eliminated || false;
            
            if (eliminated) {
                return res.json({
                    success: true,
                    eliminated: true,
                    message: '🎉 恭喜！这道题已掌握，从错题本中移除'
                });
            }
        } else {
            // 如果错误，更新错题信息
            await db.query(
                `UPDATE mistake_book
                 SET error_count = error_count + 1,
                     last_error_at = CURRENT_TIMESTAMP,
                     mastery_level = GREATEST(1, mastery_level - 1),
                     is_high_frequency = (error_count + 1 >= 3)
                 WHERE id = $1 AND user_id = $2`,
                [mistake_id, user_id]
            );
        }
        
        res.json({
            success: true,
            eliminated: false,
            message: is_correct ? '回答正确！' : '继续加油！'
        });
    } catch (error) {
        console.error('错题练习失败:', error);
        res.status(500).json({ error: '错题练习失败' });
    }
}

/**
 * 移除错题（手动）
 * DELETE /api/mistakes/:id
 */
async function removeMistake(req, res) {
    const { id } = req.params;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({ error: '未登录' });
    }
    
    try {
        const result = await db.query(
            `DELETE FROM mistake_book WHERE id = $1 AND user_id = $2`,
            [id, user_id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: '错题不存在' });
        }
        
        res.json({
            success: true,
            message: '已移除错题'
        });
    } catch (error) {
        console.error('移除错题失败:', error);
        res.status(500).json({ error: '移除错题失败' });
    }
}

/**
 * 获取高频错题 TOP10
 * GET /api/mistakes/high-freq
 */
async function getHighFrequencyMistakes(req, res) {
    const user_id = req.user?.id;
    const { limit = 10 } = req.query;
    
    if (!user_id) {
        return res.status(401).json({ error: '未登录' });
    }
    
    try {
        const result = await db.query(
            `SELECT 
                mb.id,
                mb.word_id,
                mb.error_count,
                mb.last_error_at,
                iw.word,
                iw.phonetic,
                iw.definition
            FROM mistake_book mb
            JOIN ielts_words iw ON mb.word_id = iw.id
            WHERE mb.user_id = $1
              AND mb.is_high_frequency = TRUE
              AND mb.eliminated_at IS NULL
            ORDER BY mb.error_count DESC, mb.last_error_at ASC
            LIMIT $2`,
            [user_id, parseInt(limit)]
        );
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('获取高频错题失败:', error);
        res.status(500).json({ error: '获取高频错题失败' });
    }
}

/**
 * 标记错题已掌握
 * POST /api/mistakes/eliminate
 */
async function eliminateMistake(req, res) {
    const { mistake_id } = req.body;
    const user_id = req.user?.id;
    
    if (!user_id || !mistake_id) {
        return res.status(400).json({ error: '参数不完整' });
    }
    
    try {
        const result = await db.query(
            `UPDATE mistake_book
             SET eliminated_at = CURRENT_TIMESTAMP,
                 mastery_level = 5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2`,
            [mistake_id, user_id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: '错题不存在' });
        }
        
        res.json({
            success: true,
            message: '已标记为已掌握'
        });
    } catch (error) {
        console.error('标记错题失败:', error);
        res.status(500).json({ error: '标记错题失败' });
    }
}

module.exports = {
    addMistake,
    getMistakes,
    getMistakeStats,
    practiceMistake,
    removeMistake,
    getHighFrequencyMistakes,
    eliminateMistake
};

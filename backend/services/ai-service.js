/**
 * AI 服务集成模块
 * AIielts Phase 2 - AI 解析、内容生成、智能推荐
 */

const axios = require('axios');

class AIService {
    constructor() {
        // TODO: 从环境变量读取 AI 服务配置
        // 示例使用通义千问 API
        this.apiKey = process.env.AI_API_KEY || '';
        this.apiEndpoint = process.env.AI_API_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1';
        this.model = process.env.AI_MODEL || 'qwen-turbo';
    }

    /**
     * 生成阅读题目 AI 解析
     * @param {string} articleText - 文章内容
     * @param {string} questionText - 题目
     * @param {string} userAnswer - 用户答案
     * @param {string} correctAnswer - 正确答案
     * @returns {Promise<string>} AI 解析文本
     */
    async generateReadingExplanation(articleText, questionText, userAnswer, correctAnswer) {
        const prompt = `
你是一位专业的雅思阅读老师。请根据以下文章内容和题目，为学生的答案提供详细解析。

【文章内容】
${articleText.substring(0, 500)}...

【题目】
${questionText}

【学生答案】
${userAnswer}

【正确答案】
${correctAnswer}

请提供：
1. 正确答案的定位依据（文章中的哪句话）
2. 学生答案错误的原因分析（如果答错了）
3. 解题技巧和思路
4. 相关词汇或表达的学习建议

解析要简洁明了，控制在 200 字以内。
`;

        try {
            const response = await this._callAI(prompt);
            return response;
        } catch (error) {
            console.error('AI 解析生成失败:', error);
            return '解析生成失败，请稍后重试。';
        }
    }

    /**
     * 生成阅读能力诊断报告
     * @param {Array} userAnswers - 用户答案记录
     * @param {string} questionType - 题型
     * @returns {Promise<Object>} 诊断报告
     */
    async generateReadingDiagnosis(userAnswers, questionType) {
        const totalQuestions = userAnswers.length;
        const correctCount = userAnswers.filter(a => a.isCorrect).length;
        const accuracyRate = (correctCount / totalQuestions * 100).toFixed(1);
        
        const prompt = `
你是一位专业的雅思阅读老师。请根据学生的答题情况生成诊断报告。

【答题情况】
- 总题数：${totalQuestions}
- 正确数：${correctCount}
- 正确率：${accuracyRate}%
- 题型：${questionType || '混合题型'}
- 平均用时：${this._calculateAvgTime(userAnswers)}秒/题

请提供：
1. 能力评估（强项和弱项）
2. 具体问题分析
3. 针对性的学习建议
4. 推荐的练习方向

报告要专业、具体、可操作，控制在 300 字以内。
`;

        try {
            const analysis = await this._callAI(prompt);
            return {
                accuracyRate: parseFloat(accuracyRate),
                totalQuestions,
                correctCount,
                weakPoints: this._identifyWeakPoints(userAnswers),
                analysis,
                suggestions: this._generateSuggestions(accuracyRate, questionType)
            };
        } catch (error) {
            console.error('AI 诊断生成失败:', error);
            return {
                accuracyRate: parseFloat(accuracyRate),
                totalQuestions,
                correctCount,
                analysis: '诊断生成失败，请稍后重试。',
                suggestions: []
            };
        }
    }

    /**
     * 生成个性化学习计划
     * @param {Object} userGoal - 用户目标
     * @param {Object} diagnosticResult - 诊断测试结果
     * @returns {Promise<Object>} 学习计划
     */
    async generateStudyPlan(userGoal, diagnosticResult) {
        const { examDate, targetScore, currentScore, dailyStudyHours } = userGoal;
        const { weakSkills } = diagnosticResult;

        const prompt = `
你是一位专业的雅思备考规划师。请为学生生成个性化的学习计划。

【学生情况】
- 考试日期：${examDate}
- 目标分数：${targetScore}
- 当前水平：${currentScore}
- 每日可用时间：${dailyStudyHours}小时
- 薄弱项：${weakSkills ? weakSkills.join(', ') : '暂无'}

请生成：
1. 学习阶段划分（基础/强化/冲刺）
2. 每周学习重点
3. 每日学习任务建议
4. 薄弱项专项训练安排

计划要切实可行，考虑学生的时间和水平。
`;

        try {
            const plan = await this._callAI(prompt);
            return {
                planText: plan,
                generated: true
            };
        } catch (error) {
            console.error('AI 计划生成失败:', error);
            return {
                planText: '计划生成失败，使用默认计划模板。',
                generated: false
            };
        }
    }

    /**
     * 生成写作 AI 批改
     * @param {string} essayText - 作文内容
     * @param {string} taskType - 任务类型 (task1/task2)
     * @param {string} taskDescription - 题目描述
     * @returns {Promise<Object>} 批改结果
     */
    async gradeWriting(essayText, taskType, taskDescription) {
        const prompt = `
你是一位专业的雅思考官。请根据雅思写作评分标准批改以下作文。

【任务类型】${taskType === 'task1' ? 'Task 1 (图表/地图/流程图)' : 'Task 2 (议论文)'}

【题目】
${taskDescription}

【学生作文】
${essayText}

请按照雅思写作四项评分标准进行评分和批改：
1. Task Response (任务回应) - 9 分制
2. Coherence & Cohesion (连贯衔接) - 9 分制
3. Lexical Resource (词汇丰富) - 9 分制
4. Grammatical Range & Accuracy (语法准确) - 9 分制

输出格式：
{
    "overallScore": 总分,
    "taskResponseScore": 分数,
    "coherenceScore": 分数,
    "vocabularyScore": 分数,
    "grammarScore": 分数,
    "feedback": "总体评价",
    "suggestions": ["建议 1", "建议 2", ...],
    "correctedEssay": "修改后的作文"
}

只返回 JSON 格式，不要其他内容。
`;

        try {
            const response = await this._callAI(prompt, { json: true });
            return JSON.parse(response);
        } catch (error) {
            console.error('AI 作文批改失败:', error);
            return {
                overallScore: 6.0,
                feedback: '批改服务暂时不可用，请稍后重试。',
                suggestions: ['请检查语法和拼写', '注意段落结构', '使用多样化的词汇']
            };
        }
    }

    /**
     * 生成阅读文章（AI 创作）
     * @param {string} topic - 主题
     * @param {number} difficulty - 难度 (1-9)
     * @param {string} category - 类别 (academic/general)
     * @returns {Promise<Object>} 生成的文章
     */
    async generateReadingArticle(topic, difficulty, category) {
        const prompt = `
你是一位专业的雅思阅读题目编写专家。请创作一篇雅思阅读文章。

【要求】
- 主题：${topic}
- 难度等级：${difficulty} (1-9，数字越大越难)
- 类别：${category === 'academic' ? '学术类' : '培训类'}
- 字数：400-500 词
- 风格：正式学术写作

请生成：
1. 文章标题
2. 文章内容（包含清晰的段落结构）
3. 5 个重点词汇及释义

输出 JSON 格式：
{
    "title": "标题",
    "content": "文章内容",
    "wordCount": 字数，
    "vocabulary": [{"word": "单词", "definition": "释义"}]
}
`;

        try {
            const response = await this._callAI(prompt, { json: true });
            return JSON.parse(response);
        } catch (error) {
            console.error('AI 文章生成失败:', error);
            return null;
        }
    }

    /**
     * 调用 AI API（内部方法）
     * @private
     */
    async _callAI(prompt, options = {}) {
        // TODO: 实现实际的 AI API 调用
        // 这里是示例代码，使用通义千问 API
        
        if (!this.apiKey) {
            console.warn('AI API Key 未配置，返回模拟响应');
            return this._getMockResponse(prompt, options);
        }

        try {
            const response = await axios.post(
                `${this.apiEndpoint}/services/aigc/text-generation/generation`,
                {
                    model: this.model,
                    input: {
                        messages: [
                            { role: 'system', content: '你是一位专业的雅思教育专家。' },
                            { role: 'user', content: prompt }
                        ]
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.output.text;
        } catch (error) {
            console.error('AI API 调用失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取模拟响应（用于测试和无 API Key 时）
     * @private
     */
    _getMockResponse(prompt, options) {
        if (options.json) {
            return JSON.stringify({
                overallScore: 6.5,
                feedback: '模拟批改：作文结构清晰，但需要改进语法和词汇多样性。',
                suggestions: ['使用更丰富的连接词', '注意主谓一致', '增加复杂句的使用']
            });
        }
        return '模拟解析：根据文章第 2 段第 3 行可以找到答案依据。解题关键是定位关键词，理解同义替换。建议积累相关话题词汇，提高阅读速度。';
    }

    /**
     * 计算平均用时
     * @private
     */
    _calculateAvgTime(userAnswers) {
        const totalTime = userAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
        return Math.round(totalTime / userAnswers.length);
    }

    /**
     * 识别薄弱点
     * @private
     */
    _identifyWeakPoints(userAnswers) {
        // 简单实现：根据错误类型分析
        const wrongAnswers = userAnswers.filter(a => !a.isCorrect);
        if (wrongAnswers.length === 0) return [];
        
        // TODO: 更复杂的分析逻辑
        return ['细节理解', '同义替换识别'];
    }

    /**
     * 生成学习建议
     * @private
     */
    _generateSuggestions(accuracyRate, questionType) {
        const suggestions = [];
        
        if (accuracyRate < 50) {
            suggestions.push('建议从基础词汇和语法开始复习');
            suggestions.push('多做精读练习，提高理解能力');
        } else if (accuracyRate < 70) {
            suggestions.push('加强同义替换的积累');
            suggestions.push('练习定位关键信息的技巧');
        } else {
            suggestions.push('保持练习，挑战更高难度文章');
            suggestions.push('注意控制答题时间');
        }

        return suggestions;
    }
}

module.exports = new AIService();

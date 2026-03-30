/**
 * 写作评分服务
 * 基于 MiniMax AI 进行雅思写作评分
 */

const MiniMaxClient = require('./minimax-client');

class WritingScorer {
  constructor() {
    this.minimax = new MiniMaxClient({
      model: process.env.MINIMAX_MODEL || 'abab6.5s-chat',
      timeout: 90000 // 作文评分需要更长时间
    });
  }

  /**
   * 评分（完整维度）
   * @param {object} params - 参数
   * @returns {Promise<object>} - 评分结果
   */
  async score(params) {
    const {
      topic,
      essay,
      essayType = 'task2',
      userLevel = 'intermediate',
      targetScore = 7
    } = params;

    return await this._scoreFull(essay, topic, essayType, userLevel, targetScore);
  }

  /**
   * 完整评分（雅思写作）
   * @private
   */
  async _scoreFull(essay, topic, essayType, userLevel, targetScore) {
    const prompt = `
你是一名雅思考官，有 10 年写作评分经验。请根据雅思写作评分标准进行批改。

【考生信息】
- 当前水平：${userLevel}
- 目标分数：${targetScore}
- 作文类型：${essayType === 'task2' ? 'Task 2 (议论文)' : 'Task 1 (图表/书信)'}

【题目】
${topic}

【考生作文】
${essay}

【雅思写作评分标准】
1. 任务回应 (Task Response) - 0-100
   - 是否完整回应题目要求
   - 论点是否清晰、有说服力
   - 论证是否充分（Task 2）/ 要点是否覆盖（Task 1）

2. 连贯与衔接 (Coherence & Cohesion) - 0-100
   - 文章结构是否清晰
   - 段落之间是否连贯
   - 是否使用恰当的连接词

3. 词汇资源 (Lexical Resource) - 0-100
   - 词汇是否丰富多样
   - 是否使用高级词汇
   - 用词是否准确

4. 语法多样性与准确性 (Grammatical Range & Accuracy) - 0-100
   - 句型是否多样（简单句/复合句/复杂句）
   - 语法是否正确
   - 标点使用是否恰当

【要求】
1. 按照雅思 9 分制评分，然后转换为 100 分制
2. 标注具体错误（语法、用词、逻辑）
3. 给出改进建议
4. 提供改写版本（段落级别）
5. 提取好词好句

【输出格式】严格返回 JSON：
{
  "overall_score": 70,
  "task_response": 72,
  "coherence": 68,
  "vocabulary": 75,
  "grammar": 65,
  "word_count": 250,
  "feedback": "总体评价（100 字内，中文）",
  "strengths": ["优点 1", "优点 2"],
  "weaknesses": ["需改进 1", "需改进 2"],
  "suggestions": [
    "建议 1（具体可操作）",
    "建议 2（具体可操作）",
    "建议 3（具体可操作）"
  ],
  "error_corrections": [
    {
      "original": "错误句子或短语",
      "corrected": "正确句子或短语",
      "explanation": "错误原因（中文）",
      "type": "grammar" // grammar/vocabulary/spelling/logic
    }
  ],
  "improved_paragraphs": [
    {
      "original": "原段落（前 50 字）",
      "improved": "改写后的段落",
      "explanation": "改进说明（中文）"
    }
  ],
  "vocabulary_highlights": [
    {
      "word": "好词",
      "meaning": "中文意思",
      "usage": "用法说明"
    }
  ],
  "useful_expressions": [
    "好句 1",
    "好句 2"
  ],
  "estimated_band": "6.5-7.0",
  "band_score": 7.0
}
`.trim();

    try {
      const result = await this.minimax.generate(prompt, {
        temperature: 0.3, // 降低随机性
        maxTokens: 2000,
        jsonMode: true,
        retryCount: 2
      });

      return {
        overall_score: result.overall_score || 0,
        task_response: result.task_response || 0,
        coherence: result.coherence || 0,
        vocabulary: result.vocabulary || 0,
        grammar: result.grammar || 0,
        word_count: result.word_count || this._countWords(essay),
        feedback: result.feedback || '',
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        suggestions: result.suggestions || [],
        error_corrections: result.error_corrections || [],
        improved_paragraphs: result.improved_paragraphs || [],
        vocabulary_highlights: result.vocabulary_highlights || [],
        useful_expressions: result.useful_expressions || [],
        estimated_band: result.estimated_band || '',
        band_score: result.band_score || 0
      };
    } catch (error) {
      console.error('[WritingScorer] 评分失败:', error);
      throw error;
    }
  }

  /**
   * 生成写作题目（根据学过的词汇）
   * @param {array} learnedWords - 学过的词汇列表
   * @param {string} essayType - 作文类型
   * @param {string} difficulty - 难度
   * @returns {Promise<object>}
   */
  async generateTopic(learnedWords, essayType = 'task2', difficulty = 'medium') {
    const prompt = `
你是一名雅思写作命题专家。请根据用户学过的词汇生成写作题目。

【用户学过的词汇】
${learnedWords.slice(0, 20).join(', ')}${learnedWords.length > 20 ? '...' : ''}

【要求】
1. 题目要能用到这些词汇（至少 5 个）
2. 符合雅思写作真题风格
3. 难度适中（${difficulty}）
4. 话题贴近生活

【输出格式】严格返回 JSON：
{
  "task_type": "${essayType}",
  "topic": "话题分类（如 Education/Technology/Environment）",
  "question": "完整的题目描述",
  "requirements": [
    "Give reasons for your answer",
    "Include any relevant examples from your knowledge or experience",
    "Write at least 250 words"
  ],
  "related_vocabulary": ["词汇 1", "词汇 2", "词汇 3", "词汇 4", "词汇 5"],
  "tips": "写作提示（50 字内，中文）",
  "outline_suggestions": {
    "introduction": "开头段建议",
    "body_paragraph_1": "主体段 1 建议",
    "body_paragraph_2": "主体段 2 建议",
    "conclusion": "结尾段建议"
  }
}
`.trim();

    try {
      const result = await this.bailian.generate(prompt, {
        temperature: 0.7,
        maxTokens: 1500,
        jsonMode: true
      });

      return result;
    } catch (error) {
      console.error('[WritingScorer] 出题失败:', error);
      throw error;
    }
  }

  /**
   * 提取好句（用于语料库）
   * @param {string} essay - 作文内容
   * @returns {Promise<array>}
   */
  async extractGoodSentences(essay) {
    const prompt = `
你是一名英语教师。请从以下作文中提取 3-5 个值得积累的好句子。

【作文】
${essay}

【选择标准】
1. 句型多样（复合句、强调句、倒装句等）
2. 用词准确地道
3. 表达清晰有力
4. 可用于其他话题

【输出格式】严格返回 JSON 数组：
[
  {
    "sentence": "原句",
    "translation": "中文翻译",
    "highlights": ["亮点 1", "亮点 2"],
    "usage_tips": "使用建议（适用话题）",
    "variations": ["变体 1", "变体 2"]
  }
]
`.trim();

    try {
      const result = await this.bailian.generate(prompt, {
        temperature: 0.5,
        maxTokens: 1500,
        jsonMode: true
      });

      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('[WritingScorer] 提取好句失败:', error);
      return [];
    }
  }

  /**
   * 统计单词数
   * @private
   */
  _countWords(text) {
    return text.trim().split(/\s+/).length;
  }
}

module.exports = new WritingScorer();

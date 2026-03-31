/**
 * 口语评分服务
 * 基于 MiniMax AI 进行雅思口语评分
 */

const MiniMaxClient = require('./minimax-client');

class SpeakingScorer {
  constructor() {
    this.minimax = new MiniMaxClient({
      model: process.env.MINIMAX_MODEL || 'MiniMax-M2.5',
      timeout: 60000 // 评分需要更长时间
    });
  }

  /**
   * 评分（完整维度）
   * @param {object} params - 参数
   * @returns {Promise<object>} - 评分结果
   */
  async score(params) {
    const {
      question,
      transcript,
      practiceType = 'word',
      userLevel = 'intermediate',
      targetScore = 7
    } = params;

    // 根据练习类型选择评分维度
    if (practiceType === 'word' || practiceType === 'sentence') {
      return await this._scorePronunciation(transcript, question);
    } else if (practiceType === 'conversation' || practiceType === 'ielts_mock') {
      return await this._scoreFull(transcript, question, userLevel, targetScore);
    }

    throw new Error('未知的练习类型');
  }

  /**
   * 发音评分（单词/句子）
   * @private
   */
  async _scorePronunciation(transcript, originalText) {
    const prompt = `
你是一名英语发音教练。请对比用户的跟读和原文，进行发音评分。

【原文】
${originalText}

【用户跟读】
${transcript}

【评分标准】
1. 准确度 (0-100): 发音是否准确，是否漏读/错读
2. 流利度 (0-100): 是否流畅，有无过多停顿
3. 发音 (0-100): 音标是否标准，语调是否自然

【要求】
1. 严格对比原文和跟读的差异
2. 指出具体的发音问题
3. 给出改进建议

【输出格式】严格返回 JSON：
{
  "overall_score": 75,
  "accuracy": 80,
  "fluency": 70,
  "pronunciation": 75,
  "feedback": "总体评价（30 字内）",
  "strengths": ["优点 1", "优点 2"],
  "weaknesses": ["需改进 1", "需改进 2"],
  "suggestions": ["建议 1", "建议 2"]
}
`.trim();

    try {
      const result = await this.minimax.generate(prompt, {
        temperature: 0.3, // 降低随机性
        maxTokens: 800,
        jsonMode: true
      });

      return {
        overall_score: result.overall_score || 0,
        accuracy: result.accuracy || 0,
        fluency: result.fluency || 0,
        pronunciation: result.pronunciation || 0,
        feedback: result.feedback || '',
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error('[SpeakingScorer] 发音评分失败:', error);
      throw error;
    }
  }

  /**
   * 完整评分（对话/模拟考试）
   * @private
   */
  async _scoreFull(transcript, question, userLevel, targetScore) {
    const prompt = `
你是一名雅思考官，有 10 年评分经验。请根据雅思口语评分标准进行评分。

【考生信息】
- 当前水平：${userLevel}
- 目标分数：${targetScore}

【考题】
${question}

【考生回答】
${transcript}

【雅思口语评分标准】
1. 流利度与连贯性 (Fluency & Coherence)
   - 语速是否自然流畅
   - 是否有过多停顿/重复
   - 逻辑是否清晰，是否有连接词

2. 词汇多样性 (Lexical Resource)
   - 词汇是否丰富多样
   - 是否使用高级词汇/习语
   - 用词是否准确恰当

3. 语法多样性与准确性 (Grammatical Range & Accuracy)
   - 句型是否多样（简单句/复合句）
   - 语法是否正确
   - 时态使用是否恰当

4. 发音 (Pronunciation)
   - 发音是否清晰可懂
   - 语调是否自然
   - 重音/连读是否正确

【要求】
1. 按照雅思 9 分制标准评分
2. 指出具体优缺点
3. 给出针对性改进建议
4. 评分要客观公正

【输出格式】严格返回 JSON：
{
  "overall_score": 6.5,
  "fluency": 6,
  "vocabulary": 7,
  "grammar": 6,
  "pronunciation": 7,
  "coherence": 6,
  "feedback": "总体评价（50 字内，中文）",
  "strengths": ["优点 1", "优点 2"],
  "weaknesses": ["需改进 1", "需改进 2"],
  "suggestions": [
    "建议 1（具体可操作）",
    "建议 2（具体可操作）"
  ],
  "estimated_band": "6.0-6.5",
  "word_count": 150,
  "speaking_time": "1 分 30 秒"
}
`.trim();

    try {
      const result = await this.minimax.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1200,
        jsonMode: true
      });

      return {
        overall_score: this._convertTo100(result.overall_score),
        fluency: this._convertTo100(result.fluency),
        vocabulary: this._convertTo100(result.vocabulary),
        grammar: this._convertTo100(result.grammar),
        pronunciation: this._convertTo100(result.pronunciation),
        coherence: this._convertTo100(result.coherence),
        feedback: result.feedback || '',
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        suggestions: result.suggestions || [],
        estimated_band: result.estimated_band || '',
        word_count: result.word_count || 0,
        speaking_time: result.speaking_time || ''
      };
    } catch (error) {
      console.error('[SpeakingScorer] 完整评分失败:', error);
      throw error;
    }
  }

  /**
   * 将 9 分制转换为 100 分制
   * @private
   */
  _convertTo100(bandScore) {
    if (typeof bandScore !== 'number') return 0;
    // 雅思 9 分制 → 100 分制
    // 9→100, 8→90, 7→80, 6→70, 5→60, 4→50
    return Math.round((bandScore / 9) * 100);
  }

  /**
   * 生成对话反馈（AI 对话模式）
   * @param {array} conversationHistory - 对话历史
   * @returns {Promise<object>}
   */
  async generateConversationFeedback(conversationHistory) {
    const prompt = `
你是一名雅思考官。请根据以下对话历史，给考生反馈。

【对话历史】
${JSON.stringify(conversationHistory, null, 2)}

【要求】
1. 总结整体表现
2. 指出亮点
3. 指出需要改进的地方
4. 给出 2-3 条具体建议

【输出格式】严格返回 JSON：
{
  "overall_comment": "总体评价（100 字内）",
  "highlights": ["亮点 1", "亮点 2"],
  "areas_to_improve": ["需改进 1", "需改进 2"],
  "suggestions": ["建议 1", "建议 2", "建议 3"],
  "estimated_score_range": "6.0-6.5"
}
`.trim();

    try {
      const result = await this.minimax.generate(prompt, {
        temperature: 0.4,
        maxTokens: 1000,
        jsonMode: true
      });

      return result;
    } catch (error) {
      console.error('[SpeakingScorer] 对话反馈失败:', error);
      return null;
    }
  }
}

module.exports = new SpeakingScorer();

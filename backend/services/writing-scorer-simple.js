/**
 * 写作评分服务（简化版）
 * 基于规则的评分，无需外部 API
 */

class SimpleWritingScorer {
  /**
   * 评分（简化版）
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

    const wordCount = this._countWords(essay);
    
    // 1. 任务回应（基于字数和结构）
    const taskResponse = this._scoreTaskResponse(essay, wordCount, essayType);
    
    // 2. 连贯衔接（基于连接词和段落结构）
    const coherence = this._scoreCoherence(essay);
    
    // 3. 词汇资源（基于词汇多样性）
    const vocabulary = this._scoreVocabulary(essay);
    
    // 4. 语法（基于句子结构和长度变化）
    const grammar = this._scoreGrammar(essay);
    
    // 计算总分
    const overallScore = Math.round((taskResponse + coherence + vocabulary + grammar) / 4);
    
    // 生成反馈
    const feedback = this._generateFeedback(overallScore, wordCount, {
      taskResponse,
      coherence,
      vocabulary,
      grammar
    });
    
    // 生成改进建议
    const suggestions = this._generateSuggestions({
      taskResponse,
      coherence,
      vocabulary,
      grammar
    });
    
    // 估算分数段
    const bandScore = this._scoreToBand(overallScore);
    
    return {
      overall_score: overallScore,
      task_response: taskResponse,
      coherence: coherence,
      vocabulary: vocabulary,
      grammar: grammar,
      word_count: wordCount,
      feedback,
      strengths: this._getStrengths({ taskResponse, coherence, vocabulary, grammar }),
      weaknesses: this._getWeaknesses({ taskResponse, coherence, vocabulary, grammar }),
      suggestions,
      error_corrections: [],
      improved_paragraphs: [],
      vocabulary_highlights: [],
      useful_expressions: [],
      estimated_band: bandScore,
      band_score: parseFloat(bandScore)
    };
  }

  /**
   * 统计单词数
   */
  _countWords(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * 评分：任务回应
   */
  _scoreTaskResponse(essay, wordCount, essayType) {
    let score = 50;
    
    // 字数评分
    const minWords = essayType === 'task2' ? 250 : 150;
    if (wordCount >= minWords) {
      score += 30;
    } else if (wordCount >= minWords * 0.8) {
      score += 20;
    } else if (wordCount >= minWords * 0.6) {
      score += 10;
    }
    
    // 结构评分（是否有引言和结论）
    const hasIntro = essay.toLowerCase().includes('i think') || 
                     essay.toLowerCase().includes('in my opinion') ||
                     essay.toLowerCase().includes('this essay');
    const hasConclusion = essay.toLowerCase().includes('in conclusion') || 
                          essay.toLowerCase().includes('to conclude') ||
                          essay.toLowerCase().includes('overall');
    
    if (hasIntro && hasConclusion) {
      score += 20;
    } else if (hasIntro || hasConclusion) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  /**
   * 评分：连贯衔接
   */
  _scoreCoherence(essay) {
    let score = 50;
    
    // 连接词检测
    const connectors = [
      'however', 'therefore', 'moreover', 'furthermore', 'in addition',
      'on the other hand', 'in contrast', 'as a result', 'consequently',
      'first', 'second', 'third', 'finally', 'for example', 'such as',
      'because', 'since', 'although', 'while', 'but', 'and', 'so'
    ];
    
    const lowerEssay = essay.toLowerCase();
    let connectorCount = 0;
    connectors.forEach(connector => {
      const regex = new RegExp(`\\b${connector}\\b`, 'g');
      const matches = lowerEssay.match(regex);
      if (matches) {
        connectorCount += matches.length;
      }
    });
    
    // 连接词评分
    if (connectorCount >= 10) {
      score += 30;
    } else if (connectorCount >= 5) {
      score += 20;
    } else if (connectorCount >= 3) {
      score += 10;
    }
    
    // 段落结构（假设有换行）
    const paragraphs = essay.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length >= 4) {
      score += 20;
    } else if (paragraphs.length >= 3) {
      score += 15;
    } else if (paragraphs.length >= 2) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  /**
   * 评分：词汇资源
   */
  _scoreVocabulary(essay) {
    let score = 50;
    
    const words = essay.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const uniqueWords = new Set(words);
    const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
    
    // 词汇多样性评分
    if (lexicalDiversity >= 0.7) {
      score += 30;
    } else if (lexicalDiversity >= 0.5) {
      score += 20;
    } else if (lexicalDiversity >= 0.3) {
      score += 10;
    }
    
    // 高级词汇检测（简单版）
    const advancedWords = [
      'significant', 'important', 'essential', 'crucial', 'vital',
      'beneficial', 'advantageous', 'detrimental', 'harmful',
      'consequently', 'furthermore', 'moreover', 'nevertheless',
      'comprehensive', 'substantial', 'considerable', 'remarkable'
    ];
    
    let advancedCount = 0;
    advancedWords.forEach(word => {
      if (essay.toLowerCase().includes(word)) {
        advancedCount++;
      }
    });
    
    if (advancedCount >= 5) {
      score += 20;
    } else if (advancedCount >= 3) {
      score += 15;
    } else if (advancedCount >= 1) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  /**
   * 评分：语法
   */
  _scoreGrammar(essay) {
    let score = 50;
    
    // 句子分割
    const sentences = essay.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return score;
    }
    
    // 平均句子长度
    const avgSentenceLength = essay.split(/\s+/).length / sentences.length;
    
    // 句子长度变化（标准差简化版）
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const maxLength = Math.max(...lengths);
    const minLength = Math.min(...lengths);
    const lengthVariation = maxLength - minLength;
    
    // 平均长度评分
    if (avgSentenceLength >= 15 && avgSentenceLength <= 25) {
      score += 25;
    } else if (avgSentenceLength >= 10 && avgSentenceLength <= 30) {
      score += 15;
    }
    
    // 长度变化评分
    if (lengthVariation >= 15) {
      score += 25;
    } else if (lengthVariation >= 8) {
      score += 15;
    }
    
    // 复杂句检测（简单版）
    const complexMarkers = ['which', 'that', 'who', 'whom', 'whose', 'although', 'because', 'if', 'when', 'while'];
    let complexCount = 0;
    complexMarkers.forEach(marker => {
      const regex = new RegExp(`\\b${marker}\\b`, 'gi');
      const matches = essay.match(regex);
      if (matches) {
        complexCount += matches.length;
      }
    });
    
    if (complexCount >= 5) {
      score += 25;
    } else if (complexCount >= 3) {
      score += 15;
    } else if (complexCount >= 1) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  /**
   * 生成总体反馈
   */
  _generateFeedback(score, wordCount, scores) {
    const parts = [];
    
    // 总体评价
    if (score >= 80) {
      parts.push('作文整体表现优秀！');
    } else if (score >= 70) {
      parts.push('作文整体表现良好。');
    } else if (score >= 60) {
      parts.push('作文整体表现中等。');
    } else if (score >= 50) {
      parts.push('作文需要改进。');
    } else {
      parts.push('作文需要大量练习。');
    }
    
    // 字数评价
    if (wordCount >= 250) {
      parts.push('字数符合要求。');
    } else if (wordCount >= 200) {
      parts.push('字数略少，建议扩展到 250 词以上。');
    } else {
      parts.push(`字数不足（当前${wordCount}词），建议至少写 250 词。`);
    }
    
    // 弱项提示
    const minScore = Math.min(scores.taskResponse, scores.coherence, scores.vocabulary, scores.grammar);
    if (minScore === scores.taskResponse) {
      parts.push('需要加强论点展开和论证。');
    } else if (minScore === scores.coherence) {
      parts.push('需要改善段落衔接和逻辑。');
    } else if (minScore === scores.vocabulary) {
      parts.push('需要丰富词汇使用。');
    } else if (minScore === scores.grammar) {
      parts.push('需要注意语法和句型多样性。');
    }
    
    return parts.join(' ');
  }

  /**
   * 生成改进建议
   */
  _generateSuggestions(scores) {
    const suggestions = [];
    
    if (scores.taskResponse < 70) {
      suggestions.push('扩展论点，提供更多具体例子和细节支持。');
    }
    
    if (scores.coherence < 70) {
      suggestions.push('使用更多连接词（however, therefore, moreover 等）增强段落衔接。');
    }
    
    if (scores.vocabulary < 70) {
      suggestions.push('积累并使用更多高级词汇，避免重复使用简单词汇。');
    }
    
    if (scores.grammar < 70) {
      suggestions.push('练习复杂句型（定语从句、状语从句等），增加句子多样性。');
    }
    
    // 确保至少有 3 条建议
    while (suggestions.length < 3) {
      suggestions.push('多读范文，学习优秀的表达方式和论证结构。');
    }
    
    return suggestions.slice(0, 5);
  }

  /**
   * 分数转换为雅思分
   */
  _scoreToBand(score) {
    if (score >= 90) return '8.5-9.0';
    if (score >= 80) return '7.5-8.0';
    if (score >= 70) return '6.5-7.0';
    if (score >= 60) return '5.5-6.0';
    if (score >= 50) return '4.5-5.0';
    if (score >= 40) return '3.5-4.0';
    return '3.0 以下';
  }

  /**
   * 获取优点
   */
  _getStrengths(scores) {
    const strengths = [];
    
    if (scores.taskResponse >= 70) {
      strengths.push('论点清晰，论证充分');
    }
    if (scores.coherence >= 70) {
      strengths.push('结构清晰，衔接自然');
    }
    if (scores.vocabulary >= 70) {
      strengths.push('词汇丰富，用词准确');
    }
    if (scores.grammar >= 70) {
      strengths.push('语法准确，句型多样');
    }
    
    return strengths.length > 0 ? strengths : ['基本完成了写作任务'];
  }

  /**
   * 获取需改进
   */
  _getWeaknesses(scores) {
    const weaknesses = [];
    
    if (scores.taskResponse < 60) {
      weaknesses.push('论点展开不够充分');
    }
    if (scores.coherence < 60) {
      weaknesses.push('段落衔接需要改善');
    }
    if (scores.vocabulary < 60) {
      weaknesses.push('词汇使用较为简单');
    }
    if (scores.grammar < 60) {
      weaknesses.push('语法和句型需要加强');
    }
    
    return weaknesses.length > 0 ? weaknesses : ['继续保持，争取更大进步'];
  }
}

module.exports = new SimpleWritingScorer();

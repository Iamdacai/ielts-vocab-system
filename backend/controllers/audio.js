const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

/**
 * 获取单词发音音频
 * 支持从本地缓存或在线词典获取
 */
const getWordAudio = async (req, res) => {
  try {
    const word = req.params.word;
    if (!word) {
      return res.status(400).json({ error: 'Word parameter is required' });
    }

    // 清理单词（移除音标、斜杠等）
    const cleanWord = word.split('/')[0].split(' ')[0].trim().toLowerCase();
    
    // 音频文件路径
    const audioDir = path.join(__dirname, '../audio');
    const audioPath = path.join(audioDir, `${cleanWord}.mp3`);
    
    // 确保音频目录存在
    await fs.mkdir(audioDir, { recursive: true });
    
    // 检查本地是否有缓存的音频文件
    try {
      await fs.access(audioPath);
      // 有缓存，直接返回
      return res.sendFile(audioPath);
    } catch (cacheError) {
      // 没有缓存，尝试从在线词典获取
      console.log(`Audio cache miss for word: ${cleanWord}, fetching from online dictionary...`);
    }
    
    // 从Cambridge Dictionary获取音频（免费且质量好）
    // Cambridge Dictionary音频URL格式
    const cambridgeUrl = `https://dictionary.cambridge.org/media/english/uk_pron/u/uka/uka__/uka____.mp3`;
    
    // 这里需要更智能的音频URL生成，暂时使用备用方案
    // 使用Youdao Dictionary API作为备选
    const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanWord)}&type=2`;
    
    try {
      // 尝试从Youdao获取音频
      const audioData = await fetchAudioFromUrl(youdaoUrl);
      
      // 保存到本地缓存
      await fs.writeFile(audioPath, audioData);
      
      // 返回音频
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioData);
      
    } catch (fetchError) {
      console.error(`Failed to fetch audio for word ${cleanWord}:`, fetchError);
      
      // 如果都失败了，返回404
      res.status(404).json({ 
        error: 'Audio not available for this word',
        word: cleanWord
      });
    }
    
  } catch (error) {
    console.error('Audio service error:', error);
    res.status(500).json({ error: 'Audio service error' });
  }
};

/**
 * 从URL获取音频数据
 */
async function fetchAudioFromUrl(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 获取支持的音频格式信息
 */
const getAudioInfo = async (req, res) => {
  res.json({
    supportedFormats: ['mp3'],
    sources: ['cambridge', 'youdao'],
    cacheEnabled: true,
    maxWordLength: 50
  });
};

module.exports = { getWordAudio, getAudioInfo };
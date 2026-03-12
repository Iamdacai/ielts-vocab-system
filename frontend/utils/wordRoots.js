/**
 * 词根词缀学习模块
 * 雅思高频词根词缀数据库 + 学习工具
 */

/**
 * 雅思高频词根数据库
 */
const wordRoots = [
    {
        id: 1,
        root: 'spect',
        meaning: '看，观察',
        origin: '拉丁语',
        examples: [
            { word: 'inspect', meaning: '检查，视察' },
            { word: 'respect', meaning: '尊重，尊敬' },
            { word: 'prospect', meaning: '前景，展望' },
            { word: 'retrospect', meaning: '回顾，回想' },
            { word: 'perspective', meaning: '观点，视角' }
        ]
    },
    {
        id: 2,
        root: 'dict',
        meaning: '说，讲',
        origin: '拉丁语',
        examples: [
            { word: 'predict', meaning: '预测，预言' },
            { word: 'contradict', meaning: '反驳，矛盾' },
            { word: 'dictionary', meaning: '词典，字典' },
            { word: 'indicate', meaning: '指示，表明' },
            { word: 'verdict', meaning: '裁决，判决' }
        ]
    },
    {
        id: 3,
        root: 'port',
        meaning: '携带，运送',
        origin: '拉丁语',
        examples: [
            { word: 'import', meaning: '进口，输入' },
            { word: 'export', meaning: '出口，输出' },
            { word: 'transport', meaning: '运输，运送' },
            { word: 'portable', meaning: '便携的' },
            { word: 'deport', meaning: '驱逐出境' }
        ]
    },
    {
        id: 4,
        root: 'form',
        meaning: '形状，形式',
        origin: '拉丁语',
        examples: [
            { word: 'reform', meaning: '改革，改良' },
            { word: 'transform', meaning: '转变，改造' },
            { word: 'inform', meaning: '通知，告知' },
            { word: 'uniform', meaning: '统一的，制服' },
            { word: 'formula', meaning: '公式，方案' }
        ]
    },
    {
        id: 5,
        root: 'struct',
        meaning: '建造',
        origin: '拉丁语',
        examples: [
            { word: 'construct', meaning: '建造，构造' },
            { word: 'destruct', meaning: '破坏，毁灭' },
            { word: 'instruct', meaning: '指导，教导' },
            { word: 'structure', meaning: '结构，建筑物' },
            { word: 'infrastructure', meaning: '基础设施' }
        ]
    },
    {
        id: 6,
        root: 'ject',
        meaning: '投，掷',
        origin: '拉丁语',
        examples: [
            { word: 'reject', meaning: '拒绝，驳回' },
            { word: 'project', meaning: '项目，投射' },
            { word: 'inject', meaning: '注射，注入' },
            { word: 'eject', meaning: '弹出，驱逐' },
            { word: 'subject', meaning: '主题，服从' }
        ]
    },
    {
        id: 7,
        root: 'tract',
        meaning: '拉，拖',
        origin: '拉丁语',
        examples: [
            { word: 'attract', meaning: '吸引，引起' },
            { word: 'contract', meaning: '合同，收缩' },
            { word: 'extract', meaning: '提取，摘录' },
            { word: 'distract', meaning: '分散，分心' },
            { word: 'subtract', meaning: '减去，扣除' }
        ]
    },
    {
        id: 8,
        root: 'mit/miss',
        meaning: '送，派',
        origin: '拉丁语',
        examples: [
            { word: 'submit', meaning: '提交，服从' },
            { word: 'commit', meaning: '承诺，犯罪' },
            { word: 'emit', meaning: '发射，发出' },
            { word: 'transmit', meaning: '传输，传播' },
            { word: 'dismiss', meaning: '解散，解雇' }
        ]
    },
    {
        id: 9,
        root: 'tain',
        meaning: '保持，容纳',
        origin: '拉丁语',
        examples: [
            { word: 'maintain', meaning: '维持，维护' },
            { word: 'obtain', meaning: '获得，得到' },
            { word: 'contain', meaning: '包含，容纳' },
            { word: 'retain', meaning: '保留，保持' },
            { word: 'sustain', meaning: '维持，支撑' }
        ]
    },
    {
        id: 10,
        root: 'ceed/cess',
        meaning: '走，行进',
        origin: '拉丁语',
        examples: [
            { word: 'proceed', meaning: '进行，继续' },
            { word: 'succeed', meaning: '成功，继承' },
            { word: 'access', meaning: '进入，通道' },
            { word: 'process', meaning: '过程，处理' },
            { word: 'exceed', meaning: '超过，超出' }
        ]
    },
    {
        id: 11,
        root: 'vis/vid',
        meaning: '看',
        origin: '拉丁语',
        examples: [
            { word: 'visible', meaning: '可见的' },
            { word: 'vision', meaning: '视力，愿景' },
            { word: 'evidence', meaning: '证据，明显' },
            { word: 'provide', meaning: '提供，供应' },
            { word: 'revise', meaning: '修订，复习' }
        ]
    },
    {
        id: 12,
        root: 'scrib/script',
        meaning: '写',
        origin: '拉丁语',
        examples: [
            { word: 'describe', meaning: '描述，形容' },
            { word: 'prescribe', meaning: '开处方，规定' },
            { word: 'manuscript', meaning: '手稿，原稿' },
            { word: 'subscribe', meaning: '订阅，签署' },
            { word: 'transcript', meaning: '抄本，成绩单' }
        ]
    }
];

/**
 * 常见前缀数据库
 */
const prefixes = [
    { prefix: 'un-', meaning: '不，非', examples: ['unhappy', 'unusual', 'unemployment', 'uncertain'] },
    { prefix: 're-', meaning: '再次，重新', examples: ['review', 'rewrite', 'return', 'replace'] },
    { prefix: 'pre-', meaning: '在...之前', examples: ['preview', 'predict', 'prepare', 'prevent'] },
    { prefix: 'in-/im-', meaning: '不，非；向内', examples: ['incorrect', 'impossible', 'import', 'include'] },
    { prefix: 'dis-', meaning: '不，相反', examples: ['disagree', 'disappear', 'discover', 'dismiss'] },
    { prefix: 'mis-', meaning: '错误', examples: ['mistake', 'misunderstand', 'mislead', 'misuse'] },
    { prefix: 'over-', meaning: '过度，超过', examples: ['overcome', 'overlook', 'overseas', 'overestimate'] },
    { prefix: 'under-', meaning: '在...下，不足', examples: ['understand', 'undergo', 'underestimate', 'underground'] },
    { prefix: 'inter-', meaning: '在...之间', examples: ['international', 'interact', 'intervene', 'interpret'] },
    { prefix: 'trans-', meaning: '跨越，转移', examples: ['transport', 'transform', 'translate', 'transmit'] },
    { prefix: 'sub-', meaning: '在...下，次级', examples: ['subway', 'submarine', 'substitute', 'submit'] },
    { prefix: 'super-', meaning: '超过，超级', examples: ['superior', 'supervise', 'supplement', 'supermarket'] },
    { prefix: 'co-', meaning: '共同', examples: ['cooperate', 'coexist', 'coauthor', 'coordinate'] },
    { prefix: 'anti-', meaning: '反对，对抗', examples: ['antibiotic', 'antique', 'anticipate', 'antibody'] },
    { prefix: 'auto-', meaning: '自动，自己', examples: ['automatic', 'automobile', 'autobiography', 'autonomous'] }
];

/**
 * 常见后缀数据库
 */
const suffixes = [
    { suffix: '-tion/-sion', meaning: '名词后缀（行为/状态）', examples: ['action', 'decision', 'information', 'discussion'] },
    { suffix: '-ment', meaning: '名词后缀（行为/结果）', examples: ['development', 'improvement', 'management', 'environment'] },
    { suffix: '-ness', meaning: '名词后缀（性质/状态）', examples: ['happiness', 'sadness', 'kindness', 'darkness'] },
    { suffix: '-ity', meaning: '名词后缀（性质）', examples: ['ability', 'quality', 'reality', 'possibility'] },
    { suffix: '-er/-or', meaning: '名词后缀（人/物）', examples: ['teacher', 'worker', 'actor', 'director'] },
    { suffix: '-ist', meaning: '名词后缀（专家/主义者）', examples: ['artist', 'scientist', 'specialist', 'environmentalist'] },
    { suffix: '-able/-ible', meaning: '形容词后缀（能够...的）', examples: ['readable', 'comfortable', 'visible', 'possible'] },
    { suffix: '-ful', meaning: '形容词后缀（充满...的）', examples: ['beautiful', 'helpful', 'careful', 'useful'] },
    { suffix: '-less', meaning: '形容词后缀（没有...的）', examples: ['hopeless', 'careless', 'useless', 'endless'] },
    { suffix: '-ive', meaning: '形容词后缀（有...性质的）', examples: ['active', 'creative', 'effective', 'expensive'] },
    { suffix: '-ous', meaning: '形容词后缀（具有...的）', examples: ['famous', 'dangerous', 'generous', 'curious'] },
    { suffix: '-al', meaning: '形容词后缀（...的）', examples: ['natural', 'personal', 'cultural', 'environmental'] },
    { suffix: '-ly', meaning: '副词后缀', examples: ['quickly', 'carefully', 'actually', 'especially'] },
    { suffix: '-ize/-ise', meaning: '动词后缀（使...化）', examples: ['realize', 'organize', 'recognize', 'modernize'] },
    { suffix: '-fy', meaning: '动词后缀（使...）', examples: ['simplify', 'clarify', 'identify', 'modify'] }
];

/**
 * 分析单词的词根词缀构成
 * @param {string} word - 要分析的单词
 * @returns {object} 分析结果
 */
function analyzeWord(word) {
    const lowerWord = word.toLowerCase();
    const result = {
        word,
        prefix: null,
        root: null,
        suffix: null,
        components: []
    };
    
    // 检查前缀
    for (const p of prefixes) {
        const prefixClean = p.prefix.replace(/-$/, '');
        if (lowerWord.startsWith(prefixClean)) {
            result.prefix = {
                prefix: p.prefix,
                meaning: p.meaning,
                examples: p.examples.slice(0, 3)
            };
            result.components.push({
                type: 'prefix',
                value: p.prefix,
                meaning: p.meaning
            });
            break;
        }
    }
    
    // 检查词根
    for (const r of wordRoots) {
        if (lowerWord.includes(r.root)) {
            result.root = {
                root: r.root,
                meaning: r.meaning,
                origin: r.origin,
                examples: r.examples.slice(0, 3)
            };
            result.components.push({
                type: 'root',
                value: r.root,
                meaning: r.meaning
            });
            break;
        }
    }
    
    // 检查后缀
    for (const s of suffixes) {
        const suffixClean = s.suffix.replace(/^-/, '').split('/')[0];
        if (lowerWord.endsWith(suffixClean)) {
            result.suffix = {
                suffix: s.suffix,
                meaning: s.meaning,
                examples: s.examples.slice(0, 3)
            };
            result.components.push({
                type: 'suffix',
                value: s.suffix,
                meaning: s.meaning
            });
            break;
        }
    }
    
    return result;
}

/**
 * 根据词根查找同根词
 * @param {string} root - 词根
 * @returns {array} 同根词列表
 */
function findWordsByRoot(root) {
    const rootData = wordRoots.find(r => r.root === root.toLowerCase());
    if (!rootData) return [];
    return rootData.examples;
}

/**
 * 获取词根详情
 * @param {string} root - 词根
 * @returns {object|null} 词根详情
 */
function getRootDetail(root) {
    return wordRoots.find(r => r.root === root.toLowerCase()) || null;
}

/**
 * 随机获取词根测试题
 * @param {number} count - 题目数量
 * @returns {array} 测试题
 */
function generateQuiz(count = 5) {
    const questions = [];
    const shuffledRoots = [...wordRoots].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(count, shuffledRoots.length); i++) {
        const root = shuffledRoots[i];
        const options = [
            root.meaning,
            ...wordRoots
                .filter(r => r.root !== root.root)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(r => r.meaning)
        ].sort(() => Math.random() - 0.5);
        
        questions.push({
            id: i + 1,
            question: `词根 "${root.root}" 的含义是？`,
            root: root.root,
            correctAnswer: root.meaning,
            options,
            examples: root.examples.slice(0, 2)
        });
    }
    
    return questions;
}

/**
 * 搜索词根
 * @param {string} query - 搜索关键词
 * @returns {array} 匹配的词根
 */
function searchRoots(query) {
    const lowerQuery = query.toLowerCase();
    return wordRoots.filter(r => 
        r.root.includes(lowerQuery) || 
        r.meaning.includes(lowerQuery) ||
        r.examples.some(e => e.word.includes(lowerQuery))
    );
}

module.exports = {
    wordRoots,
    prefixes,
    suffixes,
    analyzeWord,
    findWordsByRoot,
    getRootDetail,
    generateQuiz,
    searchRoots
};

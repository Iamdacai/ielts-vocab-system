/**
 * 剑桥雅思听力真题导入脚本 (优化版 - 低内存)
 * 从 GitHub 仓库导入 Cambridge IELTS 1-20 听力测试数据
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 数据库路径
const dbPath = path.join(__dirname, '../ielts_vocab.db');
const db = new sqlite3.Database(dbPath);

// 听力材料根目录
const LISTENING_ROOT = path.join(__dirname, '../audio/listening');

/**
 * 流式解析 audioscripts.md 文件，提取 Test 数量
 */
async function countTests(filePath) {
    return new Promise((resolve, reject) => {
        const tests = [];
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath),
            crlfDelay: Infinity
        });
        
        rl.on('line', (line) => {
            const match = line.match(/## Test (\d+)/);
            if (match) {
                const testNumber = parseInt(match[1]);
                tests.push(testNumber);
            }
        });
        
        rl.on('close', () => resolve(tests));
        rl.on('error', reject);
    });
}

/**
 * 创建听力测试表
 */
function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS listening_tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    book_number INTEGER NOT NULL,
                    test_number INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    difficulty TEXT DEFAULT 'medium',
                    category TEXT DEFAULT 'academic',
                    total_questions INTEGER DEFAULT 40,
                    duration_minutes INTEGER DEFAULT 30,
                    audio_path TEXT,
                    audioscript_path TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(book_number, test_number)
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

/**
 * 导入单个 book 的数据
 */
async function importBook(bookPath, bookNumber) {
    const audioscriptPath = path.join(bookPath, 'audioscripts.md');
    
    if (!fs.existsSync(audioscriptPath)) {
        console.log(`  ⚠️ 跳过 book_${bookNumber}: 缺少 audioscripts.md`);
        return 0;
    }
    
    // 流式解析获取 Test 列表
    const tests = await countTests(audioscriptPath);
    let importedCount = 0;
    
    for (const testNumber of tests) {
        const audioPath = path.join(bookPath, `test_${testNumber}.mp3`);
        const relativeAudioPath = `/api/audio/listening/book_${String(bookNumber).padStart(2, '0')}/test_${testNumber}.mp3`;
        const relativeScriptPath = `/api/audio/listening/book_${String(bookNumber).padStart(2, '0')}/audioscripts.md`;
        
        // 插入测试
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT OR REPLACE INTO listening_tests 
                (book_number, test_number, title, description, difficulty, category, total_questions, audio_path, audioscript_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                bookNumber,
                testNumber,
                `剑桥雅思 ${bookNumber} - Test ${testNumber}`,
                `剑桥雅思真题第${bookNumber}册第${testNumber}套听力测试`,
                bookNumber <= 5 ? 'easy' : bookNumber <= 10 ? 'medium' : bookNumber <= 15 ? 'hard' : 'expert',
                'academic',
                40,
                relativeAudioPath,
                relativeScriptPath
            ], function(err) {
                if (err) reject(err);
                else {
                    const testId = this.lastID;
                    console.log(`  ✅ 导入 Test ${testNumber} (ID: ${testId})`);
                    importedCount++;
                    resolve();
                }
            });
        });
        
        // 每导入 2 个测试释放一次内存
        if (importedCount % 2 === 0) {
            global.gc && global.gc();
        }
    }
    
    return importedCount;
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 开始导入剑桥雅思听力真题...\n');
    
    try {
        // 创建表
        console.log('📋 创建数据表...');
        await createTables();
        console.log('✅ 数据表准备完成\n');
        
        // 遍历所有 book 目录
        let totalImported = 0;
        const books = fs.readdirSync(LISTENING_ROOT)
            .filter(name => name.startsWith('book_'))
            .sort();
        
        console.log(`📚 找到 ${books.length} 本书\n`);
        
        for (const bookDir of books) {
            const bookNumber = parseInt(bookDir.replace('book_', ''));
            const bookPath = path.join(LISTENING_ROOT, bookDir);
            
            console.log(`📖 处理 ${bookDir}...`);
            const count = await importBook(bookPath, bookNumber);
            totalImported += count;
            
            // 每本书后释放内存
            global.gc && global.gc();
        }
        
        console.log(`\n✅ 导入完成！共导入 ${totalImported} 套听力测试`);
        console.log(`📊 数据库位置：${dbPath}`);
        
    } catch (error) {
        console.error('❌ 导入失败:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// 运行
main();

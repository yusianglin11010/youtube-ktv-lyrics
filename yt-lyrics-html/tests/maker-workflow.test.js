/**
 * Maker Workflow Integration Tests
 *
 * Tests the core workflow: Load Video -> Parse Lyrics/Pinyin -> Sync Timestamps -> Mapping -> Export
 *
 * Bug hotspots being tested:
 * 1. Timestamp recording & export
 * 2. Group mapping dialog
 * 3. Unnecessary mapping blocks on screen
 * 4. Cannot export after mapping
 *
 * @jest-environment jsdom
 */

// ============================================
// MOCKING STRATEGY
// ============================================

// Mock YouTube API
global.YT = {
    Player: jest.fn().mockImplementation((elementId, config) => ({
        getCurrentTime: jest.fn(() => 5.0),
        getVideoData: jest.fn(() => ({ title: 'Test Video' })),
        seekTo: jest.fn(),
        destroy: jest.fn(),
        playVideo: jest.fn(),
        pauseVideo: jest.fn(),
    })),
    PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        ENDED: 0
    }
};

// Mock SubtitleParser (shared module)
global.SubtitleParser = {
    extractVideoId: jest.fn((url) => {
        if (!url) return null;
        const match = url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
        return match ? match[1] : null;
    }),
    timeToSeconds: jest.fn((timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const [min, sec, ms] = parts.map(parseFloat);
            return min * 60 + sec + (ms / 100);
        }
        return 0;
    }),
    ROLE_COLORS: { '1': '#FF6B9D', '2': '#98FB98', '3': '#FFD700' }
};

// Mock URL.createObjectURL for export tests
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

// ============================================
// DOM SETUP HELPER
// ============================================

function setupDOM() {
    document.body.innerHTML = `
        <input type="text" id="videoUrl" />
        <div id="player"></div>
        <div id="timer">0.00</div>

        <textarea id="lyricsInput"></textarea>
        <textarea id="pinyinInput"></textarea>
        <input type="checkbox" id="enablePinyin" />

        <div id="lyricsDisplay"></div>
        <div id="lyricsContainer"></div>

        <table id="timestampsTable">
            <thead><tr><th></th></tr></thead>
            <tbody></tbody>
        </table>

        <div id="progressBar"></div>
        <div id="lyricsStatus"></div>

        <dialog id="groupMappingDialog">
            <div class="info-bar">
                <strong>🎹 鍵盤：</strong>拼音（← → 移動，Space 選取）、主歌詞（W/A/D 移動，Enter 連結）、Backspace 刪除、Esc 清除
                <strong>🖱️ 滑鼠：</strong>點擊拼音選取（可多選），再點擊主歌詞建立連結
            </div>
            <div id="groupMappingArea"></div>
            <button class="close-dialog-btn"></button>
            <button class="cancel-btn"></button>
        </dialog>

        <div id="fireworks-container"></div>
        <div id="fireworks-overlay"></div>

        <div class="role-selector">
            <button class="role-btn active" data-role="">無</button>
            <button class="role-btn" data-role="1">1</button>
            <button class="role-btn" data-role="2">2</button>
            <button class="role-btn" data-role="3">3</button>
        </div>
    `;

    // Mock dialog methods
    const dialog = document.getElementById('groupMappingDialog');
    dialog.showModal = jest.fn();
    dialog.close = jest.fn();
}

// ============================================
// TEST DATA
// ============================================

const TEST_DATA = {
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    simpleLyrics: '你好',
    simplePinyin: 'ni hao',
    multiLineLyrics: '你好\n世界',
    multiLinePinyin: 'ni hao\nshi jie',
    mismatchedPinyin: 'ni hao\nshi jie extra',  // Wrong word count
    mismatchedLines: 'ni hao',  // Missing line
};

// ============================================
// GLOBAL VARIABLES (simulating maker.js state)
// ============================================

let player;
let currentVideoId;
let lyrics;
let pinyinLyrics;
let pinyinEnabled;
let currentLineIndex;
let currentWordIndex;
let timestamps;
let currentRole;
let pinyinTimestamps;
let pinyinToLyricMappings;
let workflowPhase;
let mappingSelection;
let totalWordsInSong;
let timerInterval;
let currentPinyinFocus;
let currentLyricFocus;
let groupMappingState;
let groupMappingKeyboardHandler;
let mappingKeyboardListener;
let lastTimestampsUpdate;

// ============================================
// FUNCTION IMPLEMENTATIONS FOR TESTING
// ============================================

function resetState() {
    player = null;
    currentVideoId = null;
    lyrics = [];
    pinyinLyrics = [];
    pinyinEnabled = false;
    currentLineIndex = 0;
    currentWordIndex = 0;
    timestamps = [];
    currentRole = '';
    pinyinTimestamps = [];
    pinyinToLyricMappings = [];
    workflowPhase = 'INPUT';
    mappingSelection = [];
    totalWordsInSong = 0;
    timerInterval = null;
    currentPinyinFocus = 0;
    currentLyricFocus = 0;
    lastTimestampsUpdate = 0;
    groupMappingState = {
        currentLine: 0,
        pinyinData: [],
        lyricsData: [],
        mappings: [],
        selection: [],
        pinyinFocus: 0,
        lyricFocus: 0
    };
    groupMappingKeyboardHandler = null;
    mappingKeyboardListener = null;
}

function extractVideoId(url) {
    return SubtitleParser.extractVideoId(url);
}

function loadVideo() {
    let url = document.getElementById("videoUrl").value;
    let videoId = extractVideoId(url);

    if (!videoId) {
        alert("請輸入有效的 YouTube 影片網址！");
        return;
    }

    if (currentVideoId && currentVideoId !== videoId && timestamps.length > 0) {
        if (!confirm("載入新影片將會清除目前的歌詞和時間紀錄！")) {
            return;
        }
        clearAllRecords();
    }

    currentVideoId = videoId;

    if (player) {
        player.destroy();
    }

    player = new YT.Player('player', {
        height: '480',
        width: '854',
        videoId: videoId,
        playerVars: { 'autoplay': 1, 'controls': 1 },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function clearAllRecords() {
    currentLineIndex = 0;
    currentWordIndex = 0;
    timestamps = [];
    lyrics = [];
    pinyinLyrics = [];
    pinyinEnabled = false;
    totalWordsInSong = 0;
    pinyinTimestamps = [];
    pinyinToLyricMappings = [];
    workflowPhase = 'INPUT';
}

function onPlayerReady(event) {
    // Player is ready
}

function onPlayerStateChange(event) {
    // State changed
}

function parseLyricsLine(line) {
    if (!line || line.trim() === '') return [];

    // Handle explicit bracket groups [...]
    let processed = line;
    const bracketGroups = [];
    processed = processed.replace(/\[([^\]]+)\]/g, (match, group) => {
        const placeholder = `__BRACKET_${bracketGroups.length}__`;
        bracketGroups.push(group.trim());
        return placeholder;
    });

    // If has explicit slash separators, use them
    if (processed.includes('/')) {
        const parts = processed.split('/').map(p => p.trim()).filter(p => p);
        return parts.map(p => {
            const bracketMatch = p.match(/__BRACKET_(\d+)__/);
            if (bracketMatch) {
                return bracketGroups[parseInt(bracketMatch[1])];
            }
            return p;
        });
    }

    // Auto-split for CJK characters
    const result = [];
    let currentWord = '';

    for (const char of processed) {
        // Check for bracket placeholder
        if (currentWord.includes('__BRACKET_')) {
            const match = currentWord.match(/__BRACKET_(\d+)__/);
            if (match) {
                result.push(bracketGroups[parseInt(match[1])]);
                currentWord = '';
            }
        }

        // CJK character ranges
        const isCJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(char);
        const isLatin = /[a-zA-Z]/.test(char);
        const isSpace = /\s/.test(char);

        if (isCJK) {
            if (currentWord.trim()) {
                result.push(currentWord.trim());
            }
            result.push(char);
            currentWord = '';
        } else if (isSpace) {
            if (currentWord.trim()) {
                result.push(currentWord.trim());
            }
            currentWord = '';
        } else {
            currentWord += char;
        }
    }

    if (currentWord.trim()) {
        // Check for remaining bracket placeholder
        const match = currentWord.match(/__BRACKET_(\d+)__/);
        if (match) {
            result.push(bracketGroups[parseInt(match[1])]);
        } else {
            result.push(currentWord.trim());
        }
    }

    return result.filter(w => w);
}

function checkAlignment(mainLyrics, pinyinLines) {
    if (mainLyrics.length !== pinyinLines.length) {
        return false;
    }
    for (let i = 0; i < mainLyrics.length; i++) {
        if (mainLyrics[i].length !== pinyinLines[i].length) {
            return false;
        }
    }
    return true;
}

function loadLyrics() {
    let inputText = document.getElementById("lyricsInput").value.trim();
    let pinyinInput = document.getElementById("pinyinInput").value.trim();
    pinyinEnabled = document.getElementById("enablePinyin").checked;

    if (!inputText) {
        alert("❌ 請輸入主歌詞！");
        return;
    }

    lyrics = inputText.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    if (!pinyinEnabled || !pinyinInput) {
        alert("❌ 新模式需要啟用拼音並輸入拼音內容！");
        return;
    }

    pinyinLyrics = pinyinInput.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    if (lyrics.length !== pinyinLyrics.length) {
        alert(`⚠️ 主歌詞有 ${lyrics.length} 行，拼音有 ${pinyinLyrics.length} 行，請檢查對齊！`);
        return;
    }

    workflowPhase = 'SYNC_PINYIN';
    pinyinTimestamps = [];
    pinyinToLyricMappings = [];
    timestamps = [];
    currentWordIndex = 0;
    currentLineIndex = 0;
    totalWordsInSong = pinyinLyrics.reduce((sum, line) => sum + line.length, 0);

    displayPinyinSyncInterface();
    updateProgressBar();
}

function displayPinyinSyncInterface() {
    const display = document.getElementById('lyricsDisplay');
    if (!display) return;

    const currentLinePinyin = pinyinLyrics[currentLineIndex] || [];
    const currentLineLyrics = lyrics[currentLineIndex] || [];

    let html = '<div class="pinyin-sync-interface">';
    html += '<div class="pinyin-row">';
    currentLinePinyin.forEach((syllable, idx) => {
        const isActive = idx === currentWordIndex;
        const isCompleted = idx < currentWordIndex;
        html += `<span class="pinyin-syllable ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">${syllable}</span>`;
    });
    html += '</div>';
    html += '<div class="lyrics-preview">' + currentLineLyrics.join('') + '</div>';
    html += '</div>';

    display.innerHTML = html;
}

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;

    const recordedCount = pinyinTimestamps.length;
    const percentage = totalWordsInSong > 0 ? (recordedCount / totalWordsInSong) * 100 : 0;
    progressBar.style.width = percentage + '%';
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 100);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(2, '0')}`;
}

function nextPinyinSyllable() {
    if (workflowPhase !== 'SYNC_PINYIN') return;
    if (!player || typeof player.getCurrentTime !== 'function') return;

    const currentTime = player.getCurrentTime();
    const formattedTime = formatTime(currentTime);
    const currentLinePinyin = pinyinLyrics[currentLineIndex] || [];

    if (currentWordIndex >= currentLinePinyin.length) return;

    // Update previous syllable's end time
    if (pinyinTimestamps.length > 0) {
        const lastTimestamp = pinyinTimestamps[pinyinTimestamps.length - 1];
        if (!lastTimestamp.end) {
            lastTimestamp.end = formattedTime;
        }
    }

    // Record current syllable
    pinyinTimestamps.push({
        line: currentLineIndex + 1,
        syllableIndex: currentWordIndex + 1,
        syllable: currentLinePinyin[currentWordIndex],
        start: formattedTime,
        end: null,
        role: currentRole,
        mappedToWord: null
    });

    lastTimestampsUpdate = Date.now();
    currentWordIndex++;

    // Check if line is complete
    if (currentWordIndex >= currentLinePinyin.length) {
        // Set end time for last syllable
        if (pinyinTimestamps.length > 0) {
            const lastTimestamp = pinyinTimestamps[pinyinTimestamps.length - 1];
            if (!lastTimestamp.end) {
                lastTimestamp.end = formattedTime;
            }
        }

        // Check if all lines complete
        if (currentLineIndex >= pinyinLyrics.length - 1) {
            alert("🎉 拼音同步完成！請進入 Mapping 階段。");
        } else {
            // Auto-advance to next line
            currentLineIndex++;
            currentWordIndex = 0;
        }
    }

    displayPinyinSyncInterface();
    updateProgressBar();
}

function validateAllMappings() {
    for (let lineIdx = 0; lineIdx < lyrics.length; lineIdx++) {
        let linePinyin = pinyinTimestamps.filter(p => p.line === lineIdx + 1);
        let lineMappings = pinyinToLyricMappings.filter(m => m.line === lineIdx + 1);

        // Check 1: All pinyin must be mapped
        let unmapped = linePinyin.filter(p => p.mappedToWord === null);
        if (unmapped.length > 0) {
            return {
                valid: false,
                lineNumber: lineIdx + 1,
                error: `還有 ${unmapped.length} 個拼音音節未 mapping：${unmapped.map(p => p.syllable).join(', ')}`
            };
        }

        // Check 2: Mapping count must match lyrics count
        let expectedWords = lyrics[lineIdx].length;
        let mappedWords = lineMappings.length;
        if (mappedWords !== expectedWords) {
            return {
                valid: false,
                lineNumber: lineIdx + 1,
                error: `主歌詞有 ${expectedWords} 字，但只 mapping 了 ${mappedWords} 字`
            };
        }
    }

    return { valid: true };
}

function generateFinalTimestamps() {
    timestamps = [];

    pinyinToLyricMappings.forEach(mapping => {
        let linePinyin = pinyinTimestamps.filter(p => p.line === mapping.line);
        let pinyinStr = mapping.pinyinSyllableIndices.map(idx => {
            return linePinyin[idx - 1]?.syllable || '';
        }).join(' ');

        timestamps.push({
            line: mapping.line,
            wordIndex: mapping.wordIndex,
            start: mapping.start,
            end: mapping.end,
            word: mapping.word,
            pinyin: pinyinStr,
            role: mapping.role
        });
    });

    // Sort by line and wordIndex
    timestamps.sort((a, b) =>
        a.line === b.line ? a.wordIndex - b.wordIndex : a.line - b.line
    );
}

function exportTimestamps() {
    // 優先使用 pinyinTimestamps（新工作流程），否則使用 timestamps
    let usePinyinData = pinyinTimestamps.length > 0;
    let dataSource = usePinyinData ? pinyinTimestamps : timestamps;

    if (dataSource.length === 0) {
        alert("❌ 沒有可下載的時間紀錄！");
        return;
    }

    let videoTitle = player?.getVideoData?.()?.title || "ktv_timestamps";
    let videoUrl = document.getElementById("videoUrl").value || "未知網址";

    let header = `${videoTitle}\n${videoUrl}\n`;

    if (pinyinEnabled) {
        header += "#PINYIN_ENABLED\n";
    }

    header += "\n";

    // 產生時間紀錄的內容
    let content;
    if (usePinyinData) {
        // 新工作流程：從 pinyinTimestamps 匯出，並結合主歌詞
        content = header + pinyinTimestamps.map(p => {
            // 取得對應的主歌詞字元（0-based index）
            let lineIdx = p.line - 1;
            let wordIdx = p.syllableIndex - 1;
            let mainWord = (lyrics[lineIdx] && lyrics[lineIdx][wordIdx]) ? lyrics[lineIdx][wordIdx] : p.syllable;

            let baseLine = `Line ${p.line} | Word ${p.syllableIndex} | ${p.start} → ${p.end} | ${mainWord} | ${p.syllable}`;
            // 如果有角色，加入角色欄位
            if (p.role) {
                baseLine += ` | ${p.role}`;
            }
            return baseLine;
        }).join("\n");
    } else {
        // 舊工作流程：從 timestamps 匯出
        content = header + timestamps.map(t => {
            let baseLine = `Line ${t.line} | Word ${t.wordIndex} | ${t.start} → ${t.end} | ${t.word}`;
            if (pinyinEnabled) {
                baseLine += ` | ${t.pinyin || ''}`;
            }
            if (t.role) {
                if (!pinyinEnabled) {
                    baseLine += ` |`;
                }
                baseLine += ` | ${t.role}`;
            }
            return baseLine;
        }).join("\n");
    }

    content += "\n\n☆～來賓請掌聲鼓勵～☆\n☆～把酒同歡 歡樂無限～☆";

    let blob = new Blob([content], { type: "text/plain" });
    let a = document.createElement("a");

    let safeTitle = videoTitle.replace(/[<>:"/\\|?*]+/g, "");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeTitle}.txt`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function validateAndExport() {
    let validation = validateAllMappings();

    if (!validation.valid) {
        alert(`❌ 無法匯出：\n\n第 ${validation.lineNumber} 行有問題：\n${validation.error}`);
        currentLineIndex = validation.lineNumber - 1;
        // Note: displayMappingInterface() removed as mappingContainer was removed
        return;
    }

    alert("✅ 驗證通過！開始匯出...");
    generateFinalTimestamps();
    exportTimestamps();
}

function prepareGroupMappingData() {
    let pinyinInput = document.getElementById("pinyinInput").value.trim();
    let lyricsInput = document.getElementById("lyricsInput").value.trim();

    if (!pinyinInput) {
        alert("❌ 請先輸入拼音！");
        return null;
    }

    if (!lyricsInput) {
        alert("❌ 請先輸入主歌詞！");
        return null;
    }

    let pinyinLines = pinyinInput.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    let lyricsLines = lyricsInput.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    if (pinyinLines.length !== lyricsLines.length) {
        alert(`❌ 行數不對齊！\n拼音：${pinyinLines.length} 行\n主歌詞：${lyricsLines.length} 行`);
        return null;
    }

    return {
        pinyinLines: pinyinLines,
        lyricsLines: lyricsLines,
        lineCount: pinyinLines.length
    };
}

/**
 * Merge pinyinTimestamps when multiple pinyin syllables are mapped to one character.
 * - Automatically detects if timestamps exist
 * - Combines start time from first syllable and end time from last syllable
 * - Re-indexes syllableIndex to ensure sequential numbering
 */
function mergePinyinTimestamps() {
    // Skip if no timestamps exist (text-only mapping mode)
    if (pinyinTimestamps.length === 0) {
        return;
    }

    // Build a map of multi-syllable mappings
    // Key: "line-firstSyllableIndex" (1-based), Value: mapping info
    let mergeMap = new Map();

    groupMappingState.mappings.forEach(mapping => {
        if (mapping.pinyinIndices.length > 1) {
            // Convert to 1-based indices to match pinyinTimestamps
            let line = mapping.line + 1;
            let firstIdx = mapping.pinyinIndices[0] + 1;
            let key = `${line}-${firstIdx}`;
            mergeMap.set(key, {
                line: line,
                pinyinIndices: mapping.pinyinIndices.map(i => i + 1),
                combinedPinyin: mapping.pinyin
            });
        }
    });

    // If no multi-syllable mappings, nothing to merge
    if (mergeMap.size === 0) {
        return;
    }

    // Track which entries to remove and new merged entries
    let indicesToRemove = new Set();
    let mergedEntries = [];

    mergeMap.forEach((mergeInfo) => {
        // Find all timestamp entries for this merge group
        let groupEntries = mergeInfo.pinyinIndices.map(syllableIdx => {
            return pinyinTimestamps.find(p =>
                p.line === mergeInfo.line && p.syllableIndex === syllableIdx
            );
        }).filter(Boolean);

        // Only merge if ALL syllables have timestamps
        if (groupEntries.length === mergeInfo.pinyinIndices.length) {
            // Create merged entry
            let mergedEntry = {
                line: mergeInfo.line,
                syllableIndex: mergeInfo.pinyinIndices[0], // Keep first index temporarily
                start: groupEntries[0].start,
                end: groupEntries[groupEntries.length - 1].end,
                syllable: mergeInfo.combinedPinyin,
                role: groupEntries[0].role,
                mappedToWord: null
            };

            mergedEntries.push(mergedEntry);

            // Mark all original entries for removal
            mergeInfo.pinyinIndices.forEach(syllableIdx => {
                indicesToRemove.add(`${mergeInfo.line}-${syllableIdx}`);
            });
        }
    });

    // Build new array: keep non-merged entries, add merged entries
    let newTimestamps = [];

    pinyinTimestamps.forEach(entry => {
        let key = `${entry.line}-${entry.syllableIndex}`;
        if (!indicesToRemove.has(key)) {
            newTimestamps.push({ ...entry });
        }
    });

    // Add merged entries
    newTimestamps.push(...mergedEntries);

    // Sort by line and syllableIndex
    newTimestamps.sort((a, b) => {
        if (a.line !== b.line) return a.line - b.line;
        return a.syllableIndex - b.syllableIndex;
    });

    // Re-index syllableIndex to be sequential within each line
    let lineCounters = {};
    newTimestamps.forEach(entry => {
        if (!lineCounters[entry.line]) {
            lineCounters[entry.line] = 1;
        }
        entry.syllableIndex = lineCounters[entry.line]++;
    });

    // Replace global array
    pinyinTimestamps = newTimestamps;
}

// ============================================
// TEST SUITES
// ============================================

describe('Maker Workflow Integration Tests', () => {
    let originalAlert;
    let originalConfirm;

    beforeEach(() => {
        setupDOM();
        resetState();
        originalAlert = window.alert;
        originalConfirm = window.confirm;
        window.alert = jest.fn();
        window.confirm = jest.fn(() => true);
        jest.clearAllMocks();
    });

    afterEach(() => {
        window.alert = originalAlert;
        window.confirm = originalConfirm;
        if (timerInterval) {
            clearInterval(timerInterval);
        }
    });

    // ============================================
    // PHASE 1: LOAD VIDEO & PARSE LYRICS
    // ============================================
    describe('Phase 1: Load Video & Parse Lyrics', () => {
        describe('loadVideo()', () => {
            test('should initialize player with valid YouTube URL', () => {
                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;
                loadVideo();

                expect(YT.Player).toHaveBeenCalledWith('player', expect.objectContaining({
                    videoId: TEST_DATA.videoId
                }));
                expect(currentVideoId).toBe(TEST_DATA.videoId);
            });

            test('should alert and return for invalid URL', () => {
                document.getElementById('videoUrl').value = 'invalid-url';
                loadVideo();

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('有效'));
                expect(currentVideoId).toBeNull();
            });

            test('should alert for empty URL', () => {
                document.getElementById('videoUrl').value = '';
                loadVideo();

                expect(window.alert).toHaveBeenCalled();
            });

            test('should warn before clearing existing timestamps when loading new video', () => {
                currentVideoId = 'oldVideoId';
                timestamps = [{ line: 1 }];
                window.confirm = jest.fn(() => false);

                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;
                loadVideo();

                expect(window.confirm).toHaveBeenCalled();
                expect(currentVideoId).toBe('oldVideoId'); // Should not change
            });

            test('should clear records when user confirms loading new video', () => {
                currentVideoId = 'oldVideoId';
                timestamps = [{ line: 1 }];
                lyrics = [['test']];
                window.confirm = jest.fn(() => true);

                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;
                loadVideo();

                expect(timestamps).toEqual([]);
                expect(lyrics).toEqual([]);
            });
        });

        describe('parseLyricsLine()', () => {
            test('should parse CJK characters individually', () => {
                const result = parseLyricsLine('你好');
                expect(result).toEqual(['你', '好']);
            });

            test('should respect explicit slash separators', () => {
                const result = parseLyricsLine('你/好/世/界');
                expect(result).toEqual(['你', '好', '世', '界']);
            });

            test('should keep Latin words together', () => {
                const result = parseLyricsLine('Hello World');
                expect(result).toContain('Hello');
                expect(result).toContain('World');
            });

            test('should handle mixed CJK and Latin', () => {
                const result = parseLyricsLine('你好World');
                expect(result).toContain('你');
                expect(result).toContain('好');
                expect(result).toContain('World');
            });

            test('should handle bracket groups [...]', () => {
                const result = parseLyricsLine('[你好]世界');
                expect(result).toContain('你好');
                expect(result).toContain('世');
                expect(result).toContain('界');
            });

            test('should handle empty line', () => {
                const result = parseLyricsLine('');
                expect(result).toEqual([]);
            });

            test('should handle whitespace only', () => {
                const result = parseLyricsLine('   ');
                expect(result).toEqual([]);
            });

            test('should parse pinyin with spaces', () => {
                const result = parseLyricsLine('ni hao shi jie');
                expect(result).toEqual(['ni', 'hao', 'shi', 'jie']);
            });
        });

        describe('checkAlignment()', () => {
            test('should return true when lyrics and pinyin align', () => {
                const main = [['你', '好'], ['世', '界']];
                const pinyin = [['ni', 'hao'], ['shi', 'jie']];
                expect(checkAlignment(main, pinyin)).toBe(true);
            });

            test('should return false when line counts differ', () => {
                const main = [['你', '好'], ['世', '界']];
                const pinyin = [['ni', 'hao']];
                expect(checkAlignment(main, pinyin)).toBe(false);
            });

            test('should return false when word counts differ within a line', () => {
                const main = [['你', '好', '啊'], ['世', '界']];
                const pinyin = [['ni', 'hao'], ['shi', 'jie']];
                expect(checkAlignment(main, pinyin)).toBe(false);
            });
        });

        describe('loadLyrics()', () => {
            test('should parse lyrics and pinyin when both provided', () => {
                document.getElementById('lyricsInput').value = TEST_DATA.simpleLyrics;
                document.getElementById('pinyinInput').value = TEST_DATA.simplePinyin;
                document.getElementById('enablePinyin').checked = true;

                loadLyrics();

                expect(lyrics.length).toBe(1);
                expect(pinyinLyrics.length).toBe(1);
                expect(workflowPhase).toBe('SYNC_PINYIN');
            });

            test('should alert when lyrics are empty', () => {
                document.getElementById('lyricsInput').value = '';
                loadLyrics();

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('主歌詞'));
            });

            test('should alert when pinyin is required but missing', () => {
                document.getElementById('lyricsInput').value = TEST_DATA.simpleLyrics;
                document.getElementById('enablePinyin').checked = true;
                document.getElementById('pinyinInput').value = '';

                loadLyrics();

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('拼音'));
            });

            test('should alert when line counts do not match', () => {
                document.getElementById('lyricsInput').value = TEST_DATA.multiLineLyrics;
                document.getElementById('pinyinInput').value = TEST_DATA.mismatchedLines;
                document.getElementById('enablePinyin').checked = true;

                loadLyrics();

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('行'));
            });

            test('should initialize workflow state correctly', () => {
                document.getElementById('lyricsInput').value = TEST_DATA.multiLineLyrics;
                document.getElementById('pinyinInput').value = TEST_DATA.multiLinePinyin;
                document.getElementById('enablePinyin').checked = true;

                loadLyrics();

                expect(currentLineIndex).toBe(0);
                expect(currentWordIndex).toBe(0);
                expect(pinyinTimestamps).toEqual([]);
                expect(totalWordsInSong).toBe(4); // 2 + 2 syllables
            });
        });
    });

    // ============================================
    // PHASE 2: PINYIN TIMESTAMP SYNCHRONIZATION
    // ============================================
    describe('Phase 2: Pinyin Timestamp Synchronization', () => {
        beforeEach(() => {
            // Setup state after loading lyrics
            lyrics = [['你', '好'], ['世', '界']];
            pinyinLyrics = [['ni', 'hao'], ['shi', 'jie']];
            pinyinTimestamps = [];
            workflowPhase = 'SYNC_PINYIN';
            currentLineIndex = 0;
            currentWordIndex = 0;
            totalWordsInSong = 4;
            player = {
                getCurrentTime: jest.fn(() => 5.0),
                getVideoData: () => ({ title: 'Test' })
            };
        });

        describe('nextPinyinSyllable()', () => {
            test('should record timestamp for current pinyin syllable', () => {
                nextPinyinSyllable();

                expect(pinyinTimestamps.length).toBe(1);
                expect(pinyinTimestamps[0]).toMatchObject({
                    line: 1,
                    syllableIndex: 1,
                    syllable: 'ni'
                });
            });

            test('should update previous syllable end time when recording next', () => {
                player.getCurrentTime.mockReturnValueOnce(5.0);
                nextPinyinSyllable(); // Record 'ni'

                player.getCurrentTime.mockReturnValueOnce(6.0);
                nextPinyinSyllable(); // Record 'hao'

                expect(pinyinTimestamps[0].end).toBe('00:06:00');
            });

            test('should advance word index after recording', () => {
                nextPinyinSyllable();
                expect(currentWordIndex).toBe(1);
            });

            test('should auto-advance to next line when current line is complete', () => {
                nextPinyinSyllable(); // ni
                nextPinyinSyllable(); // hao

                expect(currentLineIndex).toBe(1);
                expect(currentWordIndex).toBe(0);
            });

            test('should include role in timestamp when role is selected', () => {
                currentRole = '1';
                nextPinyinSyllable();

                expect(pinyinTimestamps[0].role).toBe('1');
            });

            test('should alert when all pinyin are synced', () => {
                // Complete all syllables
                for (let i = 0; i < 4; i++) {
                    player.getCurrentTime.mockReturnValueOnce(5.0 + i);
                    nextPinyinSyllable();
                }

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('同步完成'));
            });

            test('should not record when phase is not SYNC_PINYIN', () => {
                workflowPhase = 'INPUT';
                nextPinyinSyllable();

                expect(pinyinTimestamps.length).toBe(0);
            });
        });

        describe('formatTime()', () => {
            test('should format 5.0 as 00:05:00', () => {
                expect(formatTime(5.0)).toBe('00:05:00');
            });

            test('should format 65.5 as 01:05:50', () => {
                expect(formatTime(65.5)).toBe('01:05:50');
            });

            test('should format 0 as 00:00:00', () => {
                expect(formatTime(0)).toBe('00:00:00');
            });

            test('should format 125.75 as 02:05:75', () => {
                expect(formatTime(125.75)).toBe('02:05:75');
            });
        });
    });

    // ============================================
    // PHASE 4: VALIDATION & EXPORT
    // ============================================
    describe('Phase 4: Validation & Export', () => {
        beforeEach(() => {
            lyrics = [['你', '好']];
            pinyinLyrics = [['ni', 'hao']];
            pinyinTimestamps = [
                { line: 1, syllableIndex: 1, start: '00:05:00', end: '00:05:50', syllable: 'ni', role: '1', mappedToWord: 1 },
                { line: 1, syllableIndex: 2, start: '00:05:50', end: '00:06:20', syllable: 'hao', role: '1', mappedToWord: 2 },
            ];
            pinyinToLyricMappings = [
                { line: 1, wordIndex: 1, word: '你', pinyinSyllableIndices: [1], start: '00:05:00', end: '00:05:50', role: '1' },
                { line: 1, wordIndex: 2, word: '好', pinyinSyllableIndices: [2], start: '00:05:50', end: '00:06:20', role: '1' },
            ];
            timestamps = [];
            pinyinEnabled = true;
            player = { getVideoData: () => ({ title: 'Test Song' }) };
            document.getElementById('videoUrl').value = TEST_DATA.videoUrl;
        });

        describe('validateAllMappings()', () => {
            test('should return valid when all pinyin and lyrics are mapped', () => {
                const result = validateAllMappings();
                expect(result.valid).toBe(true);
            });

            test('should return invalid when pinyin is not mapped', () => {
                pinyinTimestamps[1].mappedToWord = null;

                const result = validateAllMappings();

                expect(result.valid).toBe(false);
                expect(result.error).toContain('未 mapping');
            });

            test('should return invalid when mapping count differs from lyrics count', () => {
                pinyinToLyricMappings.pop();

                const result = validateAllMappings();

                expect(result.valid).toBe(false);
                expect(result.error).toContain('字');
            });

            test('should check all lines', () => {
                lyrics = [['你', '好'], ['世', '界']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, syllable: 'ni', mappedToWord: 1 },
                    { line: 1, syllableIndex: 2, syllable: 'hao', mappedToWord: 2 },
                    { line: 2, syllableIndex: 1, syllable: 'shi', mappedToWord: null }, // Not mapped!
                    { line: 2, syllableIndex: 2, syllable: 'jie', mappedToWord: 2 },
                ];
                pinyinToLyricMappings = [
                    { line: 1, wordIndex: 1, word: '你', pinyinSyllableIndices: [1] },
                    { line: 1, wordIndex: 2, word: '好', pinyinSyllableIndices: [2] },
                    { line: 2, wordIndex: 2, word: '界', pinyinSyllableIndices: [2] },
                ];

                const result = validateAllMappings();

                expect(result.valid).toBe(false);
                expect(result.lineNumber).toBe(2);
            });
        });

        describe('generateFinalTimestamps()', () => {
            test('should convert mappings to timestamps array', () => {
                generateFinalTimestamps();

                expect(timestamps.length).toBe(2);
                expect(timestamps[0]).toMatchObject({
                    line: 1,
                    wordIndex: 1,
                    word: '你',
                    pinyin: 'ni',
                    start: '00:05:00',
                    end: '00:05:50'
                });
            });

            test('should combine multiple pinyin syllables into single string', () => {
                pinyinToLyricMappings = [{
                    line: 1, wordIndex: 1, word: '你好',
                    pinyinSyllableIndices: [1, 2], start: '00:05:00', end: '00:06:20', role: '1'
                }];
                lyrics = [['你好']];

                generateFinalTimestamps();

                expect(timestamps[0].pinyin).toBe('ni hao');
            });

            test('should preserve role information', () => {
                generateFinalTimestamps();

                expect(timestamps[0].role).toBe('1');
            });

            test('should sort timestamps by line and wordIndex', () => {
                pinyinToLyricMappings = [
                    { line: 1, wordIndex: 2, word: '好', pinyinSyllableIndices: [2], start: '00:05:50', end: '00:06:20', role: '' },
                    { line: 1, wordIndex: 1, word: '你', pinyinSyllableIndices: [1], start: '00:05:00', end: '00:05:50', role: '' },
                ];

                generateFinalTimestamps();

                expect(timestamps[0].wordIndex).toBe(1);
                expect(timestamps[1].wordIndex).toBe(2);
            });
        });

        describe('exportTimestamps()', () => {
            test('should alert when both timestamps and pinyinTimestamps are empty', () => {
                timestamps = [];
                pinyinTimestamps = [];

                exportTimestamps();

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('沒有可下載'));
            });

            test('should create blob with correct content', () => {
                generateFinalTimestamps();

                let blobContent = '';
                const originalBlob = global.Blob;
                global.Blob = jest.fn().mockImplementation((content) => {
                    blobContent = content[0];
                    return { size: content[0].length };
                });

                exportTimestamps();

                expect(blobContent).toContain('Test Song');
                expect(blobContent).toContain('#PINYIN_ENABLED');
                expect(blobContent).toContain('Line 1 | Word 1');

                global.Blob = originalBlob;
            });

            test('should include role in export when role is set', () => {
                timestamps = [
                    { line: 1, wordIndex: 1, word: '你', pinyin: 'ni', start: '00:05:00', end: '00:05:50', role: '1' }
                ];

                let blobContent = '';
                const originalBlob = global.Blob;
                global.Blob = jest.fn().mockImplementation((content) => {
                    blobContent = content[0];
                    return { size: content[0].length };
                });

                exportTimestamps();

                expect(blobContent).toContain('| 1');

                global.Blob = originalBlob;
            });
        });

        describe('validateAndExport()', () => {
            test('should call generateFinalTimestamps and exportTimestamps when valid', () => {
                validateAndExport();

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('驗證通過'));
                expect(timestamps.length).toBeGreaterThan(0);
            });

            test('should show error and jump to problematic line when invalid', () => {
                pinyinTimestamps[1].mappedToWord = null;

                validateAndExport();

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('無法匯出'));
            });
        });
    });

    // ============================================
    // BUG REGRESSION TESTS
    // ============================================
    describe('Bug Regression Tests', () => {
        describe('Bug #1: Timestamp Recording & Export', () => {
            test('timestamps should be properly recorded with correct format MM:SS:MS', () => {
                lyrics = [['你']];
                pinyinLyrics = [['ni']];
                workflowPhase = 'SYNC_PINYIN';
                currentLineIndex = 0;
                currentWordIndex = 0;
                pinyinTimestamps = [];
                totalWordsInSong = 1;
                player = { getCurrentTime: () => 125.75 };

                nextPinyinSyllable();

                expect(pinyinTimestamps[0].start).toBe('02:05:75');
            });

            test('export should not fail when all mappings are complete', () => {
                lyrics = [['你']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:05:00', end: '00:06:00', syllable: 'ni', role: '', mappedToWord: 1 }
                ];
                pinyinToLyricMappings = [
                    { line: 1, wordIndex: 1, word: '你', pinyinSyllableIndices: [1], start: '00:05:00', end: '00:06:00', role: '' }
                ];
                pinyinEnabled = true;
                player = { getVideoData: () => ({ title: 'Test' }) };
                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;

                validateAndExport();

                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('驗證通過'));
            });
        });

        describe('Bug #4: Cannot Export After Mapping', () => {
            test('should successfully export after completing all mappings', () => {
                lyrics = [['你', '好']];
                pinyinLyrics = [['ni', 'hao']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:05:00', end: '00:05:50', syllable: 'ni', role: '', mappedToWord: 1 },
                    { line: 1, syllableIndex: 2, start: '00:05:50', end: '00:06:20', syllable: 'hao', role: '', mappedToWord: 2 },
                ];
                pinyinToLyricMappings = [
                    { line: 1, wordIndex: 1, word: '你', pinyinSyllableIndices: [1], start: '00:05:00', end: '00:05:50', role: '' },
                    { line: 1, wordIndex: 2, word: '好', pinyinSyllableIndices: [2], start: '00:05:50', end: '00:06:20', role: '' },
                ];
                pinyinEnabled = true;
                timestamps = [];
                workflowPhase = 'MAPPING';
                player = { getVideoData: () => ({ title: 'Test Song' }) };
                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;

                validateAndExport();

                expect(timestamps.length).toBe(2);
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('驗證通過'));
            });

            test('generateFinalTimestamps should populate timestamps array from mappings', () => {
                lyrics = [['你']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:05:00', end: '00:06:00', syllable: 'ni', role: '', mappedToWord: 1 }
                ];
                pinyinToLyricMappings = [
                    { line: 1, wordIndex: 1, word: '你', pinyinSyllableIndices: [1], start: '00:05:00', end: '00:06:00', role: '' }
                ];
                timestamps = [];

                generateFinalTimestamps();

                expect(timestamps.length).toBe(1);
                expect(timestamps[0].word).toBe('你');
            });

            test('exportTimestamps should work with generated timestamps', () => {
                timestamps = [
                    { line: 1, wordIndex: 1, word: '你', pinyin: 'ni', start: '00:05:00', end: '00:06:00', role: '' }
                ];
                pinyinEnabled = true;
                player = { getVideoData: () => ({ title: 'Test' }) };
                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;

                let blobContent = '';
                const originalBlob = global.Blob;
                global.Blob = jest.fn().mockImplementation((content) => {
                    blobContent = content[0];
                    return { size: content[0].length };
                });

                exportTimestamps();

                expect(blobContent).toContain('Line 1 | Word 1 | 00:05:00 → 00:06:00 | 你');

                global.Blob = originalBlob;
            });
        });
    });


    // ============================================
    // EXPORT DATA FILE PROTECTION TESTS
    // ============================================
    describe('Export Data File Protection', () => {
        describe('pinyinTimestamps export with main lyrics', () => {
            let blobContent;
            let originalBlob;

            beforeEach(() => {
                blobContent = '';
                originalBlob = global.Blob;
                global.Blob = jest.fn().mockImplementation((content) => {
                    blobContent = content[0];
                    return { size: content[0].length };
                });
                player = { getVideoData: () => ({ title: 'Test Song' }) };
                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;
            });

            afterEach(() => {
                global.Blob = originalBlob;
            });

            test('should export main lyrics from lyrics array when using pinyinTimestamps', () => {
                // Setup: 主歌詞與拼音不同
                lyrics = [['愛', '你']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:05:00', end: '00:05:50', syllable: 'ai', role: '' },
                    { line: 1, syllableIndex: 2, start: '00:05:50', end: '00:06:20', syllable: 'ni', role: '' }
                ];
                timestamps = [];
                pinyinEnabled = true;

                exportTimestamps();

                // 驗證：匯出內容必須包含主歌詞「愛」和「你」
                expect(blobContent).toContain('| 愛 | ai');
                expect(blobContent).toContain('| 你 | ni');
            });

            test('should use correct format: Line X | Word Y | time | mainWord | pinyin', () => {
                lyrics = [['我']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:23', end: '00:01:45', syllable: 'wo', role: '' }
                ];
                timestamps = [];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('Line 1 | Word 1 | 00:01:23 → 00:01:45 | 我 | wo');
            });

            test('should include role when present', () => {
                lyrics = [['唱']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:02:00', end: '00:02:30', syllable: 'chang', role: '1' }
                ];
                timestamps = [];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('Line 1 | Word 1 | 00:02:00 → 00:02:30 | 唱 | chang | 1');
            });

            test('should handle multi-line lyrics correctly', () => {
                lyrics = [['第', '一'], ['第', '二']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:20', syllable: 'di', role: '' },
                    { line: 1, syllableIndex: 2, start: '00:01:20', end: '00:01:40', syllable: 'yi', role: '' },
                    { line: 2, syllableIndex: 1, start: '00:02:00', end: '00:02:20', syllable: 'di', role: '' },
                    { line: 2, syllableIndex: 2, start: '00:02:20', end: '00:02:40', syllable: 'er', role: '' }
                ];
                timestamps = [];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('Line 1 | Word 1 | 00:01:00 → 00:01:20 | 第 | di');
                expect(blobContent).toContain('Line 1 | Word 2 | 00:01:20 → 00:01:40 | 一 | yi');
                expect(blobContent).toContain('Line 2 | Word 1 | 00:02:00 → 00:02:20 | 第 | di');
                expect(blobContent).toContain('Line 2 | Word 2 | 00:02:20 → 00:02:40 | 二 | er');
            });

            test('should fallback to syllable when lyrics index is out of bounds', () => {
                lyrics = [['只', '有', '三']]; // 只有 3 個字
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:10', syllable: 'zhi', role: '' },
                    { line: 1, syllableIndex: 2, start: '00:01:10', end: '00:01:20', syllable: 'you', role: '' },
                    { line: 1, syllableIndex: 3, start: '00:01:20', end: '00:01:30', syllable: 'san', role: '' },
                    { line: 1, syllableIndex: 4, start: '00:01:30', end: '00:01:40', syllable: 'extra', role: '' } // 超出範圍
                ];
                timestamps = [];
                pinyinEnabled = true;

                exportTimestamps();

                // 前三個應該有主歌詞
                expect(blobContent).toContain('| 只 | zhi');
                expect(blobContent).toContain('| 有 | you');
                expect(blobContent).toContain('| 三 | san');
                // 第四個應該 fallback 到拼音本身
                expect(blobContent).toContain('| extra | extra');
            });

            test('should fallback to syllable when lyrics line is missing', () => {
                lyrics = [['第', '一']]; // 只有一行
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:20', syllable: 'di', role: '' },
                    { line: 2, syllableIndex: 1, start: '00:02:00', end: '00:02:20', syllable: 'missing', role: '' } // 第二行不存在
                ];
                timestamps = [];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('| 第 | di');
                expect(blobContent).toContain('| missing | missing'); // fallback
            });
        });

        describe('timestamps export (old workflow)', () => {
            let blobContent;
            let originalBlob;

            beforeEach(() => {
                blobContent = '';
                originalBlob = global.Blob;
                global.Blob = jest.fn().mockImplementation((content) => {
                    blobContent = content[0];
                    return { size: content[0].length };
                });
                player = { getVideoData: () => ({ title: 'Test Song' }) };
                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;
                pinyinTimestamps = []; // 確保使用舊工作流程
            });

            afterEach(() => {
                global.Blob = originalBlob;
            });

            test('should export from timestamps when pinyinTimestamps is empty', () => {
                timestamps = [
                    { line: 1, wordIndex: 1, start: '00:05:00', end: '00:05:50', word: '你', pinyin: 'ni', role: '' }
                ];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('Line 1 | Word 1 | 00:05:00 → 00:05:50 | 你 | ni');
            });

            test('should include role in old workflow', () => {
                timestamps = [
                    { line: 1, wordIndex: 1, start: '00:05:00', end: '00:05:50', word: '唱', pinyin: 'chang', role: '2' }
                ];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('Line 1 | Word 1 | 00:05:00 → 00:05:50 | 唱 | chang | 2');
            });
        });

        describe('export data selection priority', () => {
            let blobContent;
            let originalBlob;

            beforeEach(() => {
                blobContent = '';
                originalBlob = global.Blob;
                global.Blob = jest.fn().mockImplementation((content) => {
                    blobContent = content[0];
                    return { size: content[0].length };
                });
                player = { getVideoData: () => ({ title: 'Test Song' }) };
                document.getElementById('videoUrl').value = TEST_DATA.videoUrl;
            });

            afterEach(() => {
                global.Blob = originalBlob;
            });

            test('should prefer pinyinTimestamps over timestamps when both exist', () => {
                lyrics = [['拼']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:30', syllable: 'pin', role: '' }
                ];
                timestamps = [
                    { line: 1, wordIndex: 1, start: '00:02:00', end: '00:02:30', word: '舊', pinyin: 'jiu', role: '' }
                ];
                pinyinEnabled = true;

                exportTimestamps();

                // 應該使用 pinyinTimestamps 的時間
                expect(blobContent).toContain('00:01:00');
                expect(blobContent).not.toContain('00:02:00');
            });

            test('should alert when no data available', () => {
                pinyinTimestamps = [];
                timestamps = [];

                exportTimestamps();

                expect(window.alert).toHaveBeenCalledWith('❌ 沒有可下載的時間紀錄！');
            });
        });

        describe('export header format', () => {
            let blobContent;
            let originalBlob;

            beforeEach(() => {
                blobContent = '';
                originalBlob = global.Blob;
                global.Blob = jest.fn().mockImplementation((content) => {
                    blobContent = content[0];
                    return { size: content[0].length };
                });
                document.getElementById('videoUrl').value = 'https://www.youtube.com/watch?v=abc123';
            });

            afterEach(() => {
                global.Blob = originalBlob;
            });

            test('should include video title in header', () => {
                player = { getVideoData: () => ({ title: '我的歌曲' }) };
                lyrics = [['測']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:00:00', end: '00:00:10', syllable: 'ce', role: '' }
                ];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('我的歌曲');
            });

            test('should include video URL in header', () => {
                player = { getVideoData: () => ({ title: 'Test' }) };
                lyrics = [['測']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:00:00', end: '00:00:10', syllable: 'ce', role: '' }
                ];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('https://www.youtube.com/watch?v=abc123');
            });

            test('should include #PINYIN_ENABLED when pinyin is enabled', () => {
                player = { getVideoData: () => ({ title: 'Test' }) };
                lyrics = [['測']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:00:00', end: '00:00:10', syllable: 'ce', role: '' }
                ];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('#PINYIN_ENABLED');
            });

            test('should include footer message', () => {
                player = { getVideoData: () => ({ title: 'Test' }) };
                lyrics = [['測']];
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:00:00', end: '00:00:10', syllable: 'ce', role: '' }
                ];
                pinyinEnabled = true;

                exportTimestamps();

                expect(blobContent).toContain('☆～來賓請掌聲鼓勵～☆');
                expect(blobContent).toContain('☆～把酒同歡 歡樂無限～☆');
            });
        });
    });

    // ============================================
    // GROUP MAPPING DATA PREPARATION
    // ============================================
    describe('Group Mapping', () => {
        describe('Dialog Visibility', () => {
            test('group mapping dialog should be hidden by default (not open)', () => {
                const dialog = document.getElementById('groupMappingDialog');
                // Dialog element should not have 'open' attribute before showModal() is called
                expect(dialog.hasAttribute('open')).toBe(false);
            });

            test('groupMappingDialog should contain info-bar element', () => {
                // info-bar in groupMappingDialog replaces the old mapping-instructions
                const dialog = document.getElementById('groupMappingDialog');
                const infoBar = dialog.querySelector('.info-bar');
                expect(infoBar).not.toBeNull();
                expect(infoBar.textContent).toContain('鍵盤');
                expect(infoBar.textContent).toContain('滑鼠');
            });
        });

        describe('prepareGroupMappingData()', () => {
            test('should prepare data correctly', () => {
                document.getElementById('pinyinInput').value = 'ni hao';
                document.getElementById('lyricsInput').value = '你好';

                const data = prepareGroupMappingData();

                expect(data).not.toBeNull();
                expect(data.pinyinLines).toHaveLength(1);
                expect(data.lyricsLines).toHaveLength(1);
            });

            test('should alert when pinyin is missing', () => {
                document.getElementById('pinyinInput').value = '';
                document.getElementById('lyricsInput').value = '你好';

                const data = prepareGroupMappingData();

                expect(data).toBeNull();
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('拼音'));
            });

            test('should alert when lyrics is missing', () => {
                document.getElementById('pinyinInput').value = 'ni hao';
                document.getElementById('lyricsInput').value = '';

                const data = prepareGroupMappingData();

                expect(data).toBeNull();
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('歌詞'));
            });

            test('should alert when line counts do not match', () => {
                document.getElementById('pinyinInput').value = 'ni hao\nshi jie';
                document.getElementById('lyricsInput').value = '你好';

                const data = prepareGroupMappingData();

                expect(data).toBeNull();
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('行數'));
            });
        });

        describe('mergePinyinTimestamps()', () => {
            beforeEach(() => {
                groupMappingState = {
                    currentLine: 0,
                    pinyinData: [],
                    lyricsData: [],
                    mappings: [],
                    selection: [],
                    pinyinFocus: 0,
                    lyricFocus: 0
                };
            });

            test('should skip merging when pinyinTimestamps is empty', () => {
                pinyinTimestamps = [];
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0, 1], lyricIdx: 0, pinyin: 'su ko', lyric: '少' }
                ];

                mergePinyinTimestamps();

                expect(pinyinTimestamps).toEqual([]);
            });

            test('should skip merging when no multi-syllable mappings exist', () => {
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:05:00', end: '00:05:50', syllable: 'su', role: '' },
                    { line: 1, syllableIndex: 2, start: '00:05:50', end: '00:06:10', syllable: 'ko', role: '' }
                ];
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0], lyricIdx: 0, pinyin: 'su', lyric: '少' },
                    { line: 0, pinyinIndices: [1], lyricIdx: 1, pinyin: 'ko', lyric: 'し' }
                ];

                const originalLength = pinyinTimestamps.length;
                mergePinyinTimestamps();

                expect(pinyinTimestamps.length).toBe(originalLength);
            });

            test('should merge timestamps when multiple pinyin syllables are mapped to one character', () => {
                // su (t0→t1), ko (t1→t2), shi (t2→t3)
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:05:00', end: '00:05:50', syllable: 'su', role: '1' },
                    { line: 1, syllableIndex: 2, start: '00:05:50', end: '00:06:10', syllable: 'ko', role: '1' },
                    { line: 1, syllableIndex: 3, start: '00:06:10', end: '00:06:45', syllable: 'shi', role: '1' }
                ];
                // [su ko] → 少, shi → し
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0, 1], lyricIdx: 0, pinyin: 'su ko', lyric: '少' },
                    { line: 0, pinyinIndices: [2], lyricIdx: 1, pinyin: 'shi', lyric: 'し' }
                ];

                mergePinyinTimestamps();

                // After merge: [su ko] (t0→t2), shi (t2→t3)
                expect(pinyinTimestamps.length).toBe(2);

                // First entry should be merged
                expect(pinyinTimestamps[0].syllable).toBe('su ko');
                expect(pinyinTimestamps[0].start).toBe('00:05:00');
                expect(pinyinTimestamps[0].end).toBe('00:06:10');
                expect(pinyinTimestamps[0].syllableIndex).toBe(1);

                // Second entry should be re-indexed
                expect(pinyinTimestamps[1].syllable).toBe('shi');
                expect(pinyinTimestamps[1].start).toBe('00:06:10');
                expect(pinyinTimestamps[1].end).toBe('00:06:45');
                expect(pinyinTimestamps[1].syllableIndex).toBe(2);
            });

            test('should inherit role from first syllable when merging', () => {
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:05:00', end: '00:05:50', syllable: 'a', role: '1' },
                    { line: 1, syllableIndex: 2, start: '00:05:50', end: '00:06:10', syllable: 'b', role: '2' }
                ];
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0, 1], lyricIdx: 0, pinyin: 'a b', lyric: '字' }
                ];

                mergePinyinTimestamps();

                expect(pinyinTimestamps[0].role).toBe('1');
            });

            test('should handle multiple merge groups in the same line', () => {
                // a b c d → [a b] [c d]
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:10', syllable: 'a', role: '' },
                    { line: 1, syllableIndex: 2, start: '00:01:10', end: '00:01:20', syllable: 'b', role: '' },
                    { line: 1, syllableIndex: 3, start: '00:01:20', end: '00:01:30', syllable: 'c', role: '' },
                    { line: 1, syllableIndex: 4, start: '00:01:30', end: '00:01:40', syllable: 'd', role: '' }
                ];
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0, 1], lyricIdx: 0, pinyin: 'a b', lyric: '甲' },
                    { line: 0, pinyinIndices: [2, 3], lyricIdx: 1, pinyin: 'c d', lyric: '乙' }
                ];

                mergePinyinTimestamps();

                expect(pinyinTimestamps.length).toBe(2);
                expect(pinyinTimestamps[0].syllable).toBe('a b');
                expect(pinyinTimestamps[0].start).toBe('00:01:00');
                expect(pinyinTimestamps[0].end).toBe('00:01:20');
                expect(pinyinTimestamps[0].syllableIndex).toBe(1);

                expect(pinyinTimestamps[1].syllable).toBe('c d');
                expect(pinyinTimestamps[1].start).toBe('00:01:20');
                expect(pinyinTimestamps[1].end).toBe('00:01:40');
                expect(pinyinTimestamps[1].syllableIndex).toBe(2);
            });

            test('should handle merge across multiple lines', () => {
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:10', syllable: 'a', role: '' },
                    { line: 1, syllableIndex: 2, start: '00:01:10', end: '00:01:20', syllable: 'b', role: '' },
                    { line: 2, syllableIndex: 1, start: '00:02:00', end: '00:02:10', syllable: 'c', role: '' },
                    { line: 2, syllableIndex: 2, start: '00:02:10', end: '00:02:20', syllable: 'd', role: '' }
                ];
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0, 1], lyricIdx: 0, pinyin: 'a b', lyric: '甲' },
                    { line: 1, pinyinIndices: [0, 1], lyricIdx: 0, pinyin: 'c d', lyric: '乙' }
                ];

                mergePinyinTimestamps();

                expect(pinyinTimestamps.length).toBe(2);

                // Line 1
                expect(pinyinTimestamps[0].line).toBe(1);
                expect(pinyinTimestamps[0].syllable).toBe('a b');
                expect(pinyinTimestamps[0].start).toBe('00:01:00');
                expect(pinyinTimestamps[0].end).toBe('00:01:20');

                // Line 2
                expect(pinyinTimestamps[1].line).toBe(2);
                expect(pinyinTimestamps[1].syllable).toBe('c d');
                expect(pinyinTimestamps[1].start).toBe('00:02:00');
                expect(pinyinTimestamps[1].end).toBe('00:02:20');
            });

            test('should re-index syllableIndex to be sequential after merge', () => {
                // a b c d e → [a b] c [d e]
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:10', syllable: 'a', role: '' },
                    { line: 1, syllableIndex: 2, start: '00:01:10', end: '00:01:20', syllable: 'b', role: '' },
                    { line: 1, syllableIndex: 3, start: '00:01:20', end: '00:01:30', syllable: 'c', role: '' },
                    { line: 1, syllableIndex: 4, start: '00:01:30', end: '00:01:40', syllable: 'd', role: '' },
                    { line: 1, syllableIndex: 5, start: '00:01:40', end: '00:01:50', syllable: 'e', role: '' }
                ];
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0, 1], lyricIdx: 0, pinyin: 'a b', lyric: '甲' },
                    { line: 0, pinyinIndices: [2], lyricIdx: 1, pinyin: 'c', lyric: '乙' },
                    { line: 0, pinyinIndices: [3, 4], lyricIdx: 2, pinyin: 'd e', lyric: '丙' }
                ];

                mergePinyinTimestamps();

                expect(pinyinTimestamps.length).toBe(3);
                expect(pinyinTimestamps[0].syllableIndex).toBe(1);
                expect(pinyinTimestamps[1].syllableIndex).toBe(2);
                expect(pinyinTimestamps[2].syllableIndex).toBe(3);
            });

            test('should only merge when ALL syllables have timestamps', () => {
                // Only first syllable has timestamp, second is missing
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:10', syllable: 'a', role: '' }
                    // syllableIndex 2 is missing
                ];
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0, 1], lyricIdx: 0, pinyin: 'a b', lyric: '字' }
                ];

                const originalTimestamps = JSON.parse(JSON.stringify(pinyinTimestamps));
                mergePinyinTimestamps();

                // Should not merge because second syllable is missing
                expect(pinyinTimestamps.length).toBe(1);
                expect(pinyinTimestamps[0].syllable).toBe('a');
            });

            test('should handle merging 3 or more syllables', () => {
                pinyinTimestamps = [
                    { line: 1, syllableIndex: 1, start: '00:01:00', end: '00:01:10', syllable: 'a', role: '' },
                    { line: 1, syllableIndex: 2, start: '00:01:10', end: '00:01:20', syllable: 'b', role: '' },
                    { line: 1, syllableIndex: 3, start: '00:01:20', end: '00:01:30', syllable: 'c', role: '' }
                ];
                groupMappingState.mappings = [
                    { line: 0, pinyinIndices: [0, 1, 2], lyricIdx: 0, pinyin: 'a b c', lyric: '字' }
                ];

                mergePinyinTimestamps();

                expect(pinyinTimestamps.length).toBe(1);
                expect(pinyinTimestamps[0].syllable).toBe('a b c');
                expect(pinyinTimestamps[0].start).toBe('00:01:00');
                expect(pinyinTimestamps[0].end).toBe('00:01:30');
            });
        });
    });
});

/**
 * YouTube KTV Lyrics - Sync Recorder Module
 * 負責時間戳記錄
 */

const SyncRecorder = (function() {
    'use strict';

    /**
     * 記錄時間戳記（通用函數，支援拼音和主歌詞）
     */
    function recordTimestamp() {
        let isPinyinMode = MakerState.workflowPhase === 'SYNC_PINYIN';
        let currentLyrics = isPinyinMode ? MakerState.pinyinLyrics : MakerState.lyrics;

        if (MakerState.currentWordIndex < currentLyrics[MakerState.currentLineIndex].length) {
            UIHandlers.addButtonEffect("nextCharBtn");
            let currentTime = VideoController.getCurrentTime();
            let startTime = LyricsProcessor.formatTime(currentTime);
            let endTime = LyricsProcessor.formatTime(currentTime + 1);

            if (isPinyinMode) {
                // 拼音模式
                // 更新上一個音節的結束時間
                if (MakerState.currentWordIndex > 0) {
                    let lastEntry = MakerState.pinyinTimestamps[MakerState.pinyinTimestamps.length - 1];
                    if (lastEntry) {
                        lastEntry.end = startTime;
                    }
                }

                // 記錄當前拼音音節
                let newEntry = {
                    line: MakerState.currentLineIndex + 1,
                    syllableIndex: MakerState.currentWordIndex + 1,
                    start: startTime,
                    end: endTime,
                    syllable: MakerState.pinyinLyrics[MakerState.currentLineIndex][MakerState.currentWordIndex],
                    role: MakerState.currentRole,
                    mappedToWord: null
                };

                MakerState.pinyinTimestamps.push(newEntry);

                // 高亮當前音節
                let syllableEl = document.getElementById(`pinyin-${MakerState.currentWordIndex}`);
                if (syllableEl) {
                    syllableEl.classList.add("highlight");
                }

                UIHandlers.updatePinyinTimestampsDisplay();

                // 檢查是否完成所有行
                if (allPinyinSynced()) {
                    promptEnterMappingPhase();
                }
            } else {
                // 主歌詞模式
                // 更新上一個字的結束時間
                if (MakerState.currentWordIndex > 0) {
                    let lastEntry = MakerState.timestamps[MakerState.timestamps.length - 1];
                    if (lastEntry && lastEntry.line === MakerState.currentLineIndex + 1) {
                        lastEntry.end = startTime;
                    }
                }

                // 記錄當前字
                let newEntry = {
                    line: MakerState.currentLineIndex + 1,
                    wordIndex: MakerState.currentWordIndex + 1,
                    start: startTime,
                    end: endTime,
                    word: MakerState.lyrics[MakerState.currentLineIndex][MakerState.currentWordIndex],
                    role: MakerState.currentRole
                };

                MakerState.timestamps.push(newEntry);

                // 高亮當前字
                let wordEl = document.getElementById(`word-${MakerState.currentWordIndex}`);
                if (wordEl) {
                    wordEl.classList.add("highlight");
                }

                UIHandlers.updateTimestampsDisplay();
            }

            MakerState.currentWordIndex++;

            // 檢查是否完成當前行
            if (MakerState.currentWordIndex >= currentLyrics[MakerState.currentLineIndex].length) {
                // 自動換行
                setTimeout(() => {
                    nextLine();
                }, 200);
            }
        }

        UIHandlers.updateProgressBar();
        if (isPinyinMode) {
            updatePinyinDownloadStatus();
        }
    }

    /**
     * 記錄拼音音節時間戳記（委派給 recordTimestamp）
     */
    function nextPinyinSyllable() {
        recordTimestamp();
    }

    /**
     * 更新拼音模式下的下載按鈕狀態
     */
    function updatePinyinDownloadStatus() {
        let downloadBtn = document.getElementById("downloadBtn");
        if (downloadBtn && MakerState.pinyinTimestamps.length > 0) {
            downloadBtn.disabled = false;
            downloadBtn.classList.add("active");
        }
    }

    /**
     * 檢查所有拼音是否已同步完成
     */
    function allPinyinSynced() {
        let totalPinyinSyllables = MakerState.pinyinLyrics.reduce((sum, line) => sum + line.length, 0);
        return MakerState.pinyinTimestamps.length >= totalPinyinSyllables;
    }

    /**
     * 提示進入 Mapping 階段
     */
    function promptEnterMappingPhase() {
        let choice = confirm(
            "✅ 所有拼音已同步完成！\n\n" +
            "您可以：\n" +
            "• 按「確定」進行拼音到歌詞的 mapping\n" +
            "• 按「取消」稍後再進行（可直接下載）"
        );

        if (choice) {
            GroupMapping.openDialog();
        }
    }

    /**
     * nextChar 函數（統一入口，委派給 recordTimestamp）
     */
    function nextChar() {
        recordTimestamp();
    }

    /**
     * 下一行
     */
    function nextLine() {
        if (MakerState.currentLineIndex < MakerState.lyrics.length - 1) {
            UIHandlers.addButtonEffect("nextLineBtn");
            MakerState.currentLineIndex++;
            MakerState.currentWordIndex = 0;

            if (MakerState.workflowPhase === 'SYNC_PINYIN') {
                UIHandlers.displayPinyinSyncInterface();
            } else {
                UIHandlers.displayLyrics();
            }
        }
    }

    /**
     * 上一行
     */
    function prevLine() {
        let isPinyinMode = MakerState.workflowPhase === 'SYNC_PINYIN';

        if (MakerState.currentLineIndex > 0) {
            UIHandlers.addButtonEffect("prevLineBtn");

            // 抓取上一句的第一個字的時間戳記
            let firstTimestamp = findFirstTimestampOfLine(MakerState.currentLineIndex - 1);

            // 設定 YouTube 播放器時間
            if (firstTimestamp !== null) {
                let targetTime = Math.max(0, firstTimestamp - 1);
                VideoController.seekTo(targetTime, true);
            }

            // 根據模式刪除本行及上一行的時間戳記
            if (isPinyinMode) {
                MakerState.pinyinTimestamps = MakerState.pinyinTimestamps.filter(t =>
                    t.line !== MakerState.currentLineIndex + 1 &&
                    t.line !== MakerState.currentLineIndex
                );
            } else {
                MakerState.timestamps = MakerState.timestamps.filter(t =>
                    t.line !== MakerState.currentLineIndex + 1 &&
                    t.line !== MakerState.currentLineIndex
                );
            }

            MakerState.currentLineIndex--;
            MakerState.currentWordIndex = 0;

            // 根據模式更新顯示
            if (isPinyinMode) {
                UIHandlers.displayPinyinSyncInterface();
                UIHandlers.updatePinyinTimestampsDisplay();
            } else {
                UIHandlers.displayLyrics();
                UIHandlers.updateTimestampsDisplay();
            }
        } else {
            // 如果在第一行,清空所有時間戳
            if (isPinyinMode) {
                MakerState.pinyinTimestamps = [];
            } else {
                MakerState.timestamps = [];
            }

            MakerState.currentLineIndex = 0;
            MakerState.currentWordIndex = 0;

            if (isPinyinMode) {
                UIHandlers.displayPinyinSyncInterface();
                UIHandlers.updatePinyinTimestampsDisplay();
            } else {
                UIHandlers.displayLyrics();
                UIHandlers.updateTimestampsDisplay();
            }
        }
    }

    /**
     * 重新開始當前行
     */
    function restartCurrentLine() {
        UIHandlers.addButtonEffect("prevCharBtn");

        let isPinyinMode = MakerState.workflowPhase === 'SYNC_PINYIN';
        let firstTimestamp = findFirstTimestampOfCurrentLine();

        // 根據模式清空時間戳記
        if (isPinyinMode) {
            MakerState.pinyinTimestamps = MakerState.pinyinTimestamps.filter(t =>
                t.line !== MakerState.currentLineIndex + 1
            );
        } else {
            MakerState.timestamps = MakerState.timestamps.filter(t =>
                t.line !== MakerState.currentLineIndex + 1
            );
        }

        // 移除當前行的高亮
        if (isPinyinMode) {
            document.querySelectorAll('.pinyin-syllable').forEach(el => {
                el.classList.remove('highlight');
            });
        } else {
            document.querySelectorAll('#lyricsDisplay .word').forEach(word => {
                word.classList.remove('highlight');
            });
        }

        MakerState.currentWordIndex = 0;

        // 根據模式更新顯示
        if (isPinyinMode) {
            UIHandlers.displayPinyinSyncInterface();
            UIHandlers.updatePinyinTimestampsDisplay();
        } else {
            UIHandlers.updateTimestampsDisplay();
            UIHandlers.updateLyricsStatus();
        }

        // 設定 YouTube 播放器時間
        if (firstTimestamp !== null) {
            let targetTime = Math.max(0, firstTimestamp - 1.5);
            VideoController.seekTo(targetTime, true);
        }
    }

    /**
     * 重置所有
     */
    function resetAll() {
        // 重置索引
        MakerState.currentLineIndex = 0;
        MakerState.currentWordIndex = 0;

        // 清空所有時間戳記
        MakerState.timestamps = [];
        MakerState.pinyinTimestamps = [];
        MakerState.pinyinToLyricMappings = [];

        // 重置工作流程狀態
        if (MakerState.pinyinEnabled) {
            MakerState.workflowPhase = 'SYNC_PINYIN';
        } else {
            MakerState.workflowPhase = 'INPUT';
        }

        // 移除所有高亮樣式
        document.querySelectorAll('.word, .pinyin-syllable').forEach(el => {
            el.classList.remove('highlight');
        });

        // 根據當前模式顯示
        if (MakerState.workflowPhase === 'SYNC_PINYIN') {
            UIHandlers.displayPinyinSyncInterface();
            UIHandlers.updatePinyinTimestampsDisplay();
        } else {
            UIHandlers.displayLyrics();
            UIHandlers.updateTimestampsDisplay();
        }
    }

    /**
     * 找到當前行第一個字的時間戳記
     */
    function findFirstTimestampOfCurrentLine() {
        let isPinyinMode = MakerState.workflowPhase === 'SYNC_PINYIN';
        let timestamps = isPinyinMode ? MakerState.pinyinTimestamps : MakerState.timestamps;

        for (let i = 0; i < timestamps.length; i++) {
            if (timestamps[i].line === MakerState.currentLineIndex + 1) {
                return LyricsProcessor.parseTimeToSeconds(timestamps[i].start);
            }
        }
        return null;
    }

    /**
     * 找到指定行的第一個字的時間戳記
     */
    function findFirstTimestampOfLine(lineIndex) {
        let isPinyinMode = MakerState.workflowPhase === 'SYNC_PINYIN';
        let timestamps = isPinyinMode ? MakerState.pinyinTimestamps : MakerState.timestamps;

        for (let i = 0; i < timestamps.length; i++) {
            if (timestamps[i].line === lineIndex + 1) {
                return LyricsProcessor.parseTimeToSeconds(timestamps[i].start);
            }
        }
        return null;
    }

    return {
        recordTimestamp,
        nextPinyinSyllable,
        nextChar,
        nextLine,
        prevLine,
        restartCurrentLine,
        resetAll,
        allPinyinSynced,
        findFirstTimestampOfCurrentLine,
        findFirstTimestampOfLine
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncRecorder;
}

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
        if (MakerState.currentLineIndex > 0) {
            UIHandlers.addButtonEffect("prevLineBtn");

            // 抓取上一句的第一個字的時間戳記
            let firstTimestamp = findFirstTimestampOfLine(MakerState.currentLineIndex - 1);

            // 設定 YouTube 播放器時間
            if (firstTimestamp !== null) {
                let targetTime = Math.max(0, firstTimestamp - 1);
                VideoController.seekTo(targetTime, true);
            }

            // 刪除本行及上一行的所有時間戳記
            MakerState.timestamps = MakerState.timestamps.filter(t =>
                t.line !== MakerState.currentLineIndex + 1 && t.line !== MakerState.currentLineIndex
            );

            MakerState.currentLineIndex--;
            MakerState.currentWordIndex = 0;
            UIHandlers.displayLyrics();
            UIHandlers.updateTimestampsDisplay();
        } else {
            MakerState.timestamps = [];
            MakerState.currentLineIndex = 0;
            MakerState.currentWordIndex = 0;
            UIHandlers.displayLyrics();
            UIHandlers.updateTimestampsDisplay();
        }
    }

    /**
     * 重新開始當前行
     */
    function restartCurrentLine() {
        UIHandlers.addButtonEffect("prevCharBtn");

        let firstTimestamp = findFirstTimestampOfCurrentLine();

        // 刪除當前行的所有時間戳記
        MakerState.timestamps = MakerState.timestamps.filter(t => t.line !== MakerState.currentLineIndex + 1);

        // 移除當前行所有字的 highlight 樣式
        document.querySelectorAll(`#lyricsDisplay .word`).forEach(word => {
            word.classList.remove("highlight");
        });

        MakerState.currentWordIndex = 0;

        UIHandlers.updateTimestampsDisplay();
        UIHandlers.updateLyricsStatus();

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
        MakerState.currentLineIndex = 0;
        MakerState.currentWordIndex = 0;
        MakerState.timestamps = [];
        UIHandlers.displayLyrics();
        UIHandlers.updateTimestampsDisplay();
    }

    /**
     * 找到當前行第一個字的時間戳記
     */
    function findFirstTimestampOfCurrentLine() {
        for (let i = 0; i < MakerState.timestamps.length; i++) {
            if (MakerState.timestamps[i].line === MakerState.currentLineIndex + 1) {
                return LyricsProcessor.parseTimeToSeconds(MakerState.timestamps[i].start);
            }
        }
        return null;
    }

    /**
     * 找到指定行的第一個字的時間戳記
     */
    function findFirstTimestampOfLine(lineIndex) {
        for (let i = 0; i < MakerState.timestamps.length; i++) {
            if (MakerState.timestamps[i].line === lineIndex + 1) {
                return LyricsProcessor.parseTimeToSeconds(MakerState.timestamps[i].start);
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

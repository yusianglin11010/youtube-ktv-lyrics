/**
 * YouTube KTV Lyrics Extension - Subtitle Parser Module
 * 字幕檔案解析模組
 */

const SubtitleParser = (function() {
    'use strict';

    // 字幕行解析正則表達式
    const SUBTITLE_LINE_REGEX = /Line (\d+) \| Word (\d+) \| (\d{2}):(\d{2}):(\d{2}) → (\d{2}):(\d{2}):(\d{2}) \| (.+)/;

    // YouTube URL 解析正則表達式
    const YOUTUBE_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/)([^#\&\?]{11})/;

    /**
     * 將時間字串轉換為秒數
     * @param {string} timeStr - 時間字串，格式為 "MM:SS:MS"
     * @returns {number} 秒數（包含小數）
     */
    function timeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(parseFloat);
        if (parts.length !== 3) {
            throw new Error(`Invalid time format: ${timeStr}`);
        }
        const [min, sec, ms] = parts;
        return min * 60 + sec + (ms / 100);
    }

    /**
     * 從 YouTube URL 中提取影片 ID
     * @param {string} url - YouTube 影片 URL
     * @returns {string|null} 影片 ID 或 null
     */
    function extractVideoId(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }
        const match = url.match(YOUTUBE_URL_REGEX);
        return match ? match[1] : null;
    }

    /**
     * 解析單行字幕
     * @param {string} line - 字幕行文字
     * @returns {object|null} 解析結果或 null
     */
    function parseSubtitleLine(line) {
        const match = line.match(SUBTITLE_LINE_REGEX);
        if (!match) {
            return null;
        }

        const lineNumber = parseInt(match[1], 10);
        const wordIndex = parseInt(match[2], 10);
        const startTime = timeToSeconds(`${match[3]}:${match[4]}:${match[5]}`);
        const endTime = timeToSeconds(`${match[6]}:${match[7]}:${match[8]}`);
        // 將空格轉換為特殊標記，以便顯示時保留
        const word = match[9].replace(/ /g, '␣').replace(/　/g, '␣␣');

        return {
            line: lineNumber,
            wordIndex: wordIndex,
            startTime: startTime,
            endTime: endTime,
            word: word
        };
    }

    /**
     * 插入緩衝圓點（用於靜音段落）
     * @param {number} lineNumber - 行號
     * @param {number} startTime - 圓點開始時間
     * @param {number} endTime - 圓點結束時間
     * @returns {Array} 圓點字幕條目陣列
     */
    function createBufferCircles(lineNumber, startTime, endTime) {
        return [
            {
                line: lineNumber,
                wordIndex: 1,
                startTime: startTime,
                endTime: endTime,
                word: '•••'
            },
            {
                line: lineNumber,
                wordIndex: 2,
                startTime: endTime,
                endTime: endTime,
                word: '&nbsp;'
            }
        ];
    }

    /**
     * 解析完整的字幕檔案
     * @param {string} text - 字幕檔案內容
     * @returns {object} 解析結果，包含 videoId, title, data
     */
    function parseSubtitleFile(text) {
        if (!text || typeof text !== 'string') {
            return { error: '字幕檔案內容為空' };
        }

        // 分割行，過濾空行
        const lines = text.split('\n').filter(line => line.trim() !== '');

        if (lines.length < 3) {
            return { error: '字幕檔案格式錯誤：至少需要標題、URL 和一行字幕' };
        }

        const title = lines[0].trim();
        const videoUrl = lines[1].trim();
        const subtitleLines = lines.slice(2);

        // 提取影片 ID
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return { error: '無法從字幕檔案中提取有效的 YouTube 影片 ID' };
        }

        const subtitleData = [];
        let previousEndTime = 0;
        let previousLine = 0;

        subtitleLines.forEach((line, index) => {
            const parsed = parseSubtitleLine(line);
            if (!parsed) {
                return; // 跳過無法解析的行
            }

            const { line: lineNumber, wordIndex, startTime, endTime, word } = parsed;
            let adjustedWordIndex = wordIndex;

            // 檢查是否需要插入緩衝圓點
            // 條件：換行且間隔超過 4 秒，或是第一個字且開始時間 >= 4 秒
            const isNewLine = lineNumber !== previousLine;
            const hasLongGap = startTime - previousEndTime > 4;
            const isFirstEntryWithDelay = index === 0 && startTime >= 4;

            if ((isNewLine && hasLongGap) || isFirstEntryWithDelay) {
                const circleStartTime = Math.max(startTime - 3, 0);
                const circleEndTime = startTime;

                const circles = createBufferCircles(lineNumber, circleStartTime, circleEndTime);
                subtitleData.push(...circles);

                // 調整原始字幕的 wordIndex
                adjustedWordIndex += 2;
            }

            // 添加原始字幕
            subtitleData.push({
                line: lineNumber,
                wordIndex: adjustedWordIndex,
                startTime: startTime,
                endTime: endTime,
                word: word
            });

            previousEndTime = endTime;
            previousLine = lineNumber;
        });

        if (subtitleData.length === 0) {
            return { error: '無法解析任何字幕內容' };
        }

        return {
            videoId: videoId,
            title: title,
            url: videoUrl,
            data: subtitleData
        };
    }

    /**
     * 驗證字幕檔案格式
     * @param {string} text - 字幕檔案內容
     * @returns {object} 驗證結果 { valid: boolean, error?: string }
     */
    function validateSubtitleFile(text) {
        const result = parseSubtitleFile(text);
        if (result.error) {
            return { valid: false, error: result.error };
        }
        return { valid: true, videoId: result.videoId, lineCount: result.data.length };
    }

    // 導出 API
    return {
        timeToSeconds,
        extractVideoId,
        parseSubtitleLine,
        parseSubtitleFile,
        validateSubtitleFile,
        // 導出常數供測試使用
        _SUBTITLE_LINE_REGEX: SUBTITLE_LINE_REGEX,
        _YOUTUBE_URL_REGEX: YOUTUBE_URL_REGEX
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubtitleParser;
}

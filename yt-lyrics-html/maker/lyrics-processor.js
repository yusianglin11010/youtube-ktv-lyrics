/**
 * YouTube KTV Lyrics - Lyrics Processor Module
 * 負責歌詞解析與處理
 */

const LyricsProcessor = (function() {
    'use strict';

    /**
     * 解析單行歌詞，根據 `/` 來標示獨立字元組
     */
    function parseLyricsLine(line) {
        if (line.includes("/")) {
            return splitBySlashes(line);
        }
        let markedLine = addSlashesToWords(line);
        return splitBySlashes(markedLine);
    }

    /**
     * 逐字標記 `/`
     */
    function addSlashesToWords(line) {
        let result = "";
        let len = line.length;
        let thirdSymbolCount = 0;
        let inBracket = false;

        for (let i = 0; i < len; i++) {
            let char = line[i];
            let nextChar = line[i + 1] || "";

            // 標註模式開始
            if (char === "[") {
                inBracket = true;
                continue;
            }

            // 標註模式結束
            if (char === "]") {
                inBracket = false;
                result += "/";
                continue;
            }

            // 如果在標註模式內，直接加入字元
            if (inBracket) {
                result += char;
                continue;
            }

            result += char;

            // 定義字元類型
            let isLatin = /[\p{Script=Latin}'\u0300-\u036F]/u.test(char);
            let isCJK = /[\p{Script=Han}\p{Script=Hangul}]/u.test(char);
            let isNumber = /[1234567890１２３４５６７８９０]/u.test(char);
            let isHiraganaKatakana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char);
            let isKanaLongOrSmall = /[ぁぃぅぇぉゅょゃっーァィゥェォュョャッ]/u.test(char);
            let isPunctuationOrSpace = /[ \-,　.;:?!，。；：？！、」)）"]/u.test(char);
            let isSecondClassPunctuation = /[「(（¿¡]/u.test(char);
            let isThirdClassPunctuation = /["]/u.test(char);

            let isNextLatin = /[\p{Script=Latin}'\u0300-\u036F]/u.test(nextChar);
            let isNextCJK = /[\p{Script=Han}\p{Script=Hangul}]/u.test(nextChar);
            let isNextNumber = /[1234567890１２３４５６７８９０]/u.test(nextChar);
            let isNextHiraganaKatakana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(nextChar);
            let isNextKanaLongOrSmall = /[ぁぃぅぇぉゅょゃっーァィゥェォュョャッ]/u.test(nextChar);
            let isNextPunctuationOrSpace = /[ \-,　.;:?!，。；：？！、」)）"]/u.test(nextChar);

            // 規則 0: 當前字元為最後一個字元
            if (i === len - 1) {
                result += "/";
                continue;
            }

            // 規則 1: 當前字元為拉丁字母
            if (isLatin) {
                if (!(isNextLatin || isNextPunctuationOrSpace)) {
                    result += "/";
                }
                continue;
            }

            // 規則 2: 當前字元為漢字或韓文字
            if (isCJK) {
                if (!(isNextKanaLongOrSmall || isNextPunctuationOrSpace)) {
                    result += "/";
                }
                continue;
            }

            // 規則 3: 當前字元為空格或第一類標點符號
            if (isPunctuationOrSpace) {
                if (!(isNextPunctuationOrSpace)) {
                    result += "/";
                }
                continue;
            }

            // 規則 4: 當前字元為第二類標點符號
            if (isSecondClassPunctuation) {
                continue;
            }

            // 規則 5: 當前字元為第三類標點符號
            if (isThirdClassPunctuation) {
                thirdSymbolCount++;
                if (thirdSymbolCount % 2 === 0) {
                    result += "/";
                }
                continue;
            }

            // 規則 6: 當前字元為日文字
            if (isHiraganaKatakana) {
                if (!(isNextKanaLongOrSmall || isNextPunctuationOrSpace)) {
                    result += "/";
                }
                continue;
            }

            // 規則 7: 當前字元為日文字的半音或長音
            if (isKanaLongOrSmall) {
                if (!(isNextKanaLongOrSmall)) {
                    result += "/";
                }
                continue;
            }

            // 規則 8: 當前字元為數字
            if (isNumber) {
                if (!(isNextNumber || isNextPunctuationOrSpace)) {
                    result += "/";
                }
                continue;
            }
        }

        return result;
    }

    /**
     * 根據 `/` 來拆分字元組
     */
    function splitBySlashes(line) {
        return line.split("/").filter(word => word.trim().length > 0);
    }

    /**
     * 解析拼音行（用於群組 mapping）
     */
    function parsePinyinLineForGrouping(line) {
        let cleaned = line.replace(/\[([^\]]+)\]/g, (_match, group) => {
            return group.trim();
        });
        return parseLyricsLine(cleaned);
    }

    /**
     * 載入歌詞
     */
    function loadLyrics() {
        let inputText = document.getElementById("lyricsInput").value.trim();
        let pinyinInput = document.getElementById("pinyinInput").value.trim();
        MakerState.pinyinEnabled = document.getElementById("enablePinyin").checked;

        if (!inputText) {
            alert("❌ 請輸入主歌詞！");
            return;
        }

        // 解析主歌詞
        MakerState.lyrics = inputText.split("\n")
            .map(line => parseLyricsLine(line))
            .filter(line => line.length > 0);

        // 檢查是否啟用拼音模式
        if (MakerState.pinyinEnabled && pinyinInput) {
            // 解析拼音
            MakerState.pinyinLyrics = pinyinInput.split("\n")
                .map(line => parseLyricsLine(line))
                .filter(line => line.length > 0);

            // 驗證行數對齊
            if (MakerState.lyrics.length !== MakerState.pinyinLyrics.length) {
                alert(`⚠️ 主歌詞有 ${MakerState.lyrics.length} 行，拼音有 ${MakerState.pinyinLyrics.length} 行，請檢查對齊！`);
                return;
            }

            // 初始化拼音優先工作流程
            MakerState.workflowPhase = 'SYNC_PINYIN';
            MakerState.pinyinTimestamps = [];
            MakerState.pinyinToLyricMappings = [];
            MakerState.timestamps = [];
            MakerState.currentWordIndex = 0;
            MakerState.currentLineIndex = 0;
            MakerState.totalWordsInSong = MakerState.pinyinLyrics.reduce((sum, line) => sum + line.length, 0);

            UIHandlers.displayPinyinSyncInterface();
        } else {
            // 不使用拼音，直接同步主歌詞
            MakerState.pinyinEnabled = false;
            MakerState.pinyinLyrics = [];
            MakerState.pinyinTimestamps = [];
            MakerState.pinyinToLyricMappings = [];
            MakerState.timestamps = [];
            MakerState.currentWordIndex = 0;
            MakerState.currentLineIndex = 0;
            MakerState.workflowPhase = 'SYNC_LYRICS';
            MakerState.totalWordsInSong = MakerState.lyrics.reduce((sum, line) => sum + line.length, 0);

            UIHandlers.displayLyrics();
        }

        UIHandlers.updateProgressBar();
    }

    /**
     * 驗證歌詞與拼音對齊
     */
    function validateAlignment() {
        let inputText = document.getElementById("lyricsInput").value.trim();
        let pinyinInput = document.getElementById("pinyinInput").value.trim();
        let validateBtn = document.querySelector(".validate-btn");

        if (!inputText) {
            alert("請先輸入主歌詞！");
            return;
        }

        if (!pinyinInput) {
            alert("請先輸入拼音！");
            return;
        }

        let mainLines = inputText.split("\n")
            .map(line => parseLyricsLine(line))
            .filter(line => line.length > 0);

        let pinyinLines = pinyinInput.split("\n")
            .map(line => parseLyricsLine(line))
            .filter(line => line.length > 0);

        // 檢查行數
        if (mainLines.length !== pinyinLines.length) {
            validateBtn.classList.remove("success");
            validateBtn.classList.add("error");
            validateBtn.textContent = "行數不符";
            setTimeout(() => {
                validateBtn.classList.remove("error");
                validateBtn.textContent = "驗證對齊";
            }, 2000);
            alert(`❌ 行數不對齊！\n主歌詞：${mainLines.length} 行\n拼音：${pinyinLines.length} 行`);
            return;
        }

        // 檢查每行字數
        let mismatchLines = [];
        for (let i = 0; i < mainLines.length; i++) {
            if (mainLines[i].length !== pinyinLines[i].length) {
                mismatchLines.push({
                    line: i + 1,
                    mainCount: mainLines[i].length,
                    pinyinCount: pinyinLines[i].length
                });
            }
        }

        if (mismatchLines.length > 0) {
            validateBtn.classList.remove("success");
            validateBtn.classList.add("error");
            validateBtn.textContent = "字數不符";
            setTimeout(() => {
                validateBtn.classList.remove("error");
                validateBtn.textContent = "驗證對齊";
            }, 2000);

            let details = mismatchLines.slice(0, 5).map(m =>
                `第 ${m.line} 行：主歌詞 ${m.mainCount} 字，拼音 ${m.pinyinCount} 字`
            ).join("\n");

            if (mismatchLines.length > 5) {
                details += `\n...還有 ${mismatchLines.length - 5} 行不對齊`;
            }

            alert(`❌ 部分行的字數不對齊！\n\n${details}`);
            return;
        }

        // 全部對齊
        validateBtn.classList.remove("error");
        validateBtn.classList.add("success");
        validateBtn.textContent = "對齊成功";
        setTimeout(() => {
            validateBtn.classList.remove("success");
            validateBtn.textContent = "驗證對齊";
        }, 2000);
    }

    /**
     * 格式化時間
     */
    function formatTime(seconds) {
        let min = Math.floor(seconds / 60).toString().padStart(2, '0');
        let sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        let ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
        return `${min}:${sec}:${ms}`;
    }

    /**
     * 解析時間格式轉換為秒數
     */
    function parseTimeToSeconds(timeString) {
        try {
            return SubtitleParser.timeToSeconds(timeString);
        } catch (e) {
            return null;
        }
    }

    return {
        parseLyricsLine,
        addSlashesToWords,
        splitBySlashes,
        parsePinyinLineForGrouping,
        loadLyrics,
        validateAlignment,
        formatTime,
        parseTimeToSeconds
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LyricsProcessor;
}

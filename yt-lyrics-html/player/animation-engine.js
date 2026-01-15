/**
 * YouTube KTV Lyrics - Animation Engine Module
 * 負責動畫引擎，統一使用 backgroundPosition 動畫方式
 */

const AnimationEngine = (function() {
    'use strict';

    let syncInterval = null;
    let lastUpdateTime = 0;

    /**
     * 啟動同步計時器
     */
    function startSyncTimer() {
        if (syncInterval) {
            clearInterval(syncInterval);
        }
        syncInterval = setInterval(() => {
            if (PlayerState.player && PlayerState.player.getCurrentTime) {
                let currentTime = parseFloat(PlayerState.player.getCurrentTime().toFixed(2));
                updateDisplay(currentTime);
            }
        }, 1);
    }

    /**
     * 停止同步計時器
     */
    function stopSyncTimer() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    /**
     * 更新字幕顯示
     */
    function updateDisplay(currentTime) {
        let displayArea = document.getElementById("lyricsDisplay");
        displayArea.innerHTML = "";

        const maxLine = Math.max(...PlayerState.subtitleData.map(entry => entry.line));

        // 找到當前時間對應的行數
        let activeLines = new Set();
        let minFutureEntry = null;

        PlayerState.subtitleData.forEach(entry => {
            if (currentTime >= entry.startTime && currentTime <= entry.endTime) {
                activeLines.add(entry.line);
            }
            if (entry.startTime >= currentTime && (minFutureEntry === null || entry.startTime < minFutureEntry.startTime)) {
                minFutureEntry = entry;
            }
        });

        if (activeLines.size === 0 && minFutureEntry) {
            activeLines.add(minFutureEntry.line);
        }

        // 偵測快進快退
        if (AnimationUtils.detectFastSeek(currentTime, lastUpdateTime)) {
            let nearestEntry = AnimationUtils.findNearestEntry(PlayerState.subtitleData, currentTime);
            if (nearestEntry) {
                if (nearestEntry.line % 2 === 1) {
                    PlayerState.currentOddLineIndex = nearestEntry.line;
                    PlayerState.currentEvenLineIndex = PlayerState.currentOddLineIndex + 1;
                } else {
                    PlayerState.currentEvenLineIndex = nearestEntry.line;
                    PlayerState.currentOddLineIndex = PlayerState.currentEvenLineIndex + 1;
                }
            }
        }
        lastUpdateTime = currentTime;

        // 取得當前行數的字幕
        let upperLyrics = PlayerState.subtitleData.filter(entry => entry.line === PlayerState.currentOddLineIndex);
        let lowerLyrics = PlayerState.subtitleData.filter(entry => entry.line === PlayerState.currentEvenLineIndex);

        let upperLineDiv = document.createElement("div");
        upperLineDiv.classList.add("lyrics-line");
        upperLineDiv.style.fontSize = PlayerState.currentFontSize + "px";

        let lowerLineDiv = document.createElement("div");
        lowerLineDiv.classList.add("lyrics-line");
        lowerLineDiv.style.fontSize = PlayerState.currentFontSize + "px";

        upperLyrics.forEach(entry => {
            upperLineDiv.appendChild(createWordSpan(entry, currentTime));
        });

        lowerLyrics.forEach(entry => {
            lowerLineDiv.appendChild(createWordSpan(entry, currentTime));
        });

        displayArea.appendChild(upperLineDiv);
        displayArea.appendChild(lowerLineDiv);

        // 字幕換行邏輯
        if (
            upperLyrics.length > 0 &&
            AnimationUtils.shouldAdvanceLine(currentTime, upperLyrics[upperLyrics.length - 1].endTime) &&
            maxLine >= PlayerState.currentOddLineIndex + 2
        ) {
            PlayerState.currentOddLineIndex += 2;
        }

        if (
            lowerLyrics.length > 0 &&
            AnimationUtils.shouldAdvanceLine(currentTime, lowerLyrics[lowerLyrics.length - 1].endTime) &&
            maxLine >= PlayerState.currentEvenLineIndex + 2
        ) {
            PlayerState.currentEvenLineIndex += 2;
        }
    }

    /**
     * 建立字詞 span 元素
     * 統一使用 backgroundPosition 動畫（與 Extension 一致）
     */
    function createWordSpan(entry, currentTime) {
        let wordSpan = document.createElement("span");
        wordSpan.classList.add("word");
        wordSpan.style.fontSize = PlayerState.currentFontSize + "px";

        let wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        // 取得顏色設定
        let highlightColor = getHighlightColor(entry);
        let shadowColor = document.getElementById("highlightShadowColor").value;

        // 拼音層（如果有）
        if (entry.pinyin) {
            let pinyinSpan = document.createElement("span");
            pinyinSpan.classList.add("pinyin-text");
            pinyinSpan.style.fontSize = (PlayerState.currentFontSize * Constants.PINYIN_FONT_SCALE) + "px";

            // 使用 backgroundPosition 動畫
            AnimationUtils.initGradientAnimation(pinyinSpan, highlightColor, 'white');
            pinyinSpan.textContent = entry.pinyin;
            pinyinSpan.style.textShadow = `1px 1px 3px ${shadowColor}`;

            // 套用動畫進度
            animateWord(entry, pinyinSpan, currentTime);

            wordContainer.appendChild(pinyinSpan);
        }

        // 主字幕層
        let mainText = document.createElement("span");
        mainText.classList.add("main-text");
        mainText.innerHTML = entry.word.replace(/␣␣/g, "&nbsp;&nbsp;").replace(/␣/g, "&nbsp;");
        mainText.style.fontSize = PlayerState.currentFontSize + "px";

        // 使用 backgroundPosition 動畫
        AnimationUtils.initGradientAnimation(mainText, highlightColor, 'white');
        mainText.style.textShadow = `2px 2px 5px ${shadowColor}`;

        // 套用動畫進度
        animateWord(entry, mainText, currentTime);

        wordContainer.appendChild(mainText);
        wordSpan.appendChild(wordContainer);

        return wordSpan;
    }

    /**
     * 取得高亮顏色
     */
    function getHighlightColor(entry) {
        if (entry.role && PlayerState.roleColors[entry.role]) {
            return PlayerState.roleColors[entry.role];
        }
        return document.getElementById("highlightTextColor").value;
    }

    /**
     * 動畫更新（使用 backgroundPosition）
     */
    function animateWord(entry, element, currentTime) {
        AnimationUtils.applyAnimationToElement(element, entry, currentTime);

        let progress = AnimationUtils.calculateProgress(entry, currentTime);
        if (progress < 1) {
            setTimeout(() => {
                if (PlayerState.player && PlayerState.player.getCurrentTime) {
                    animateWord(entry, element, PlayerState.player.getCurrentTime());
                }
            }, 20);
        }
    }

    /**
     * 重置狀態
     */
    function reset() {
        lastUpdateTime = 0;
        PlayerState.currentOddLineIndex = 1;
        PlayerState.currentEvenLineIndex = 2;
    }

    return {
        startSyncTimer,
        stopSyncTimer,
        updateDisplay,
        reset
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationEngine;
}

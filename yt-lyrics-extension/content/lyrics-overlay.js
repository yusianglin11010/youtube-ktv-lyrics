/**
 * YouTube KTV Lyrics Extension - Lyrics Overlay Module
 * 歌詞覆蓋層顯示模組
 */

const LyricsOverlay = (function() {
    'use strict';

    // 狀態變數
    let container = null;
    let displayArea = null;
    let subtitleData = [];
    let currentOddLineIndex = 1;
    let currentEvenLineIndex = 2;
    let lastUpdateTime = 0;
    let animationFrameId = null;
    let isEnabled = true;
    let getTimeFn = null;
    let activeTimeouts = new Set(); // 追蹤所有活動的 setTimeout

    // 設定
    let settings = {
        font: 'NotoSans',
        fontSize: 40,
        highlightColor: '#80D9E5',
        shadowColor: '#1D1B1B',
        timeOffset: 0
    };

    /**
     * 建立覆蓋層容器
     * @param {HTMLElement} parentElement - 父元素
     */
    function createOverlayContainer(parentElement) {
        if (container) {
            container.remove();
        }

        container = document.createElement('div');
        container.id = 'yt-ktv-lyrics-container';

        displayArea = document.createElement('div');
        displayArea.id = 'yt-ktv-lyrics-display';

        container.appendChild(displayArea);

        if (parentElement) {
            parentElement.appendChild(container);
        }

        return container;
    }

    /**
     * 取得覆蓋層容器
     * @returns {HTMLElement|null}
     */
    function getContainer() {
        return container;
    }

    /**
     * 設定字幕資料
     * @param {Array} data - 字幕資料陣列
     */
    function setSubtitleData(data) {
        subtitleData = data || [];
        // 重置行索引和快取
        currentOddLineIndex = 1;
        currentEvenLineIndex = 2;
        lastUpdateTime = 0;
        cachedUpperLineIndex = -1;
        cachedLowerLineIndex = -1;
        wordElements = [];
        isShowingEndMessage = false;

        if (displayArea) {
            displayArea.innerHTML = '';
        }
    }

    /**
     * 取得字幕資料
     * @returns {Array}
     */
    function getSubtitleData() {
        return subtitleData;
    }

    /**
     * 更新設定
     * @param {object} newSettings - 新設定
     */
    function updateSettings(newSettings) {
        settings = { ...settings, ...newSettings };
        applyStyles();
    }

    /**
     * 取得目前設定
     * @returns {object}
     */
    function getSettings() {
        return { ...settings };
    }

    /**
     * 套用樣式
     */
    function applyStyles() {
        if (displayArea) {
            displayArea.style.fontFamily = settings.font;
            displayArea.style.fontSize = settings.fontSize + 'px';
        }
    }

    /**
     * 清除所有活動的計時器
     */
    function clearAllTimeouts() {
        activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        activeTimeouts.clear();
    }

    /**
     * 單字高亮動畫（單次更新，不遞迴）
     * 使用 background-position 控制漸層進度，實現 KTV 風格的文字填充效果
     * @param {object} entry - 字幕條目
     * @param {HTMLElement} textEl - 文字元素
     * @param {number} currentTime - 當前時間
     */
    function animateWordHighlight(entry, textEl, currentTime) {
        const totalDuration = entry.endTime - entry.startTime;
        const elapsedTime = Math.max(0, currentTime - entry.startTime);
        const progress = Math.min(1, elapsedTime / totalDuration);

        // 使用 background-position 控制漸層
        // 100% = 未開始 (顯示白色)
        // 0% = 完成 (顯示高亮色)
        const bgPosition = (1 - progress) * 100;
        textEl.style.backgroundPosition = `${bgPosition}% 0`;
    }

    // 快取目前顯示的行索引，用於判斷是否需要重建 DOM
    let cachedUpperLineIndex = -1;
    let cachedLowerLineIndex = -1;
    let wordElements = []; // 儲存 {entry, highlightText, pinyinHighlight} 的陣列
    let isShowingEndMessage = false; // 是否正在顯示結尾訊息

    /**
     * 更新歌詞顯示
     * @param {number} currentTime - 當前播放時間（秒）
     */
    function updateDisplay(currentTime) {
        if (!displayArea || !isEnabled || subtitleData.length === 0) {
            return;
        }

        // 套用時間偏移
        const adjustedTime = currentTime + settings.timeOffset;

        // 獲取字幕的最大行數
        const maxLine = Math.max(...subtitleData.map(entry => entry.line));

        // 檢查是否所有歌詞已播放完畢
        const lastEntry = subtitleData[subtitleData.length - 1];
        if (lastEntry && adjustedTime > lastEntry.endTime + 1.5) {
            // 歌詞已結束，顯示慶祝訊息
            if (!isShowingEndMessage) {
                showEndMessage();
                isShowingEndMessage = true;
            }
            return;
        } else if (isShowingEndMessage && adjustedTime <= lastEntry.endTime) {
            // 使用者倒退播放，重新顯示歌詞
            isShowingEndMessage = false;
            cachedUpperLineIndex = -1;
            cachedLowerLineIndex = -1;
        }

        // 判斷是否發生快進快退（時間跳躍超過 0.5 秒）
        if (Math.abs(adjustedTime - lastUpdateTime) > 0.5) {
            const nearestEntry = subtitleData.find(entry => entry.startTime >= adjustedTime);
            if (nearestEntry) {
                if (nearestEntry.line % 2 === 1) {
                    currentOddLineIndex = nearestEntry.line;
                    currentEvenLineIndex = currentOddLineIndex + 1;
                } else {
                    currentEvenLineIndex = nearestEntry.line;
                    currentOddLineIndex = currentEvenLineIndex + 1;
                }
            }
        }
        lastUpdateTime = adjustedTime;

        // 取得當前行數的字幕
        const upperLyrics = subtitleData.filter(entry => entry.line === currentOddLineIndex);
        const lowerLyrics = subtitleData.filter(entry => entry.line === currentEvenLineIndex);

        // 檢查是否需要換行（重建 DOM）
        const needsRebuild = (cachedUpperLineIndex !== currentOddLineIndex) ||
                            (cachedLowerLineIndex !== currentEvenLineIndex);

        if (needsRebuild) {
            // 重建 DOM
            displayArea.innerHTML = '';
            wordElements = [];

            // 建立上方行 div
            const upperLineDiv = document.createElement('div');
            upperLineDiv.classList.add('yt-ktv-line');
            upperLineDiv.style.fontSize = settings.fontSize + 'px';

            // 建立下方行 div
            const lowerLineDiv = document.createElement('div');
            lowerLineDiv.classList.add('yt-ktv-line');
            lowerLineDiv.style.fontSize = settings.fontSize + 'px';

            // 填充上方行
            upperLyrics.forEach(entry => {
                const wordData = createWordSpanWithRefs(entry, adjustedTime);
                upperLineDiv.appendChild(wordData.element);
                wordElements.push(wordData);
            });

            // 填充下方行
            lowerLyrics.forEach(entry => {
                const wordData = createWordSpanWithRefs(entry, adjustedTime);
                lowerLineDiv.appendChild(wordData.element);
                wordElements.push(wordData);
            });

            displayArea.appendChild(upperLineDiv);
            displayArea.appendChild(lowerLineDiv);

            cachedUpperLineIndex = currentOddLineIndex;
            cachedLowerLineIndex = currentEvenLineIndex;
        } else {
            // 只更新 background-position，不重建 DOM
            wordElements.forEach(({ entry, textEl, pinyinEl }) => {
                animateWordHighlight(entry, textEl, adjustedTime);
                if (pinyinEl) {
                    animateWordHighlight(entry, pinyinEl, adjustedTime);
                }
            });
        }

        // 字幕換行條件
        if (upperLyrics.length > 0 &&
            adjustedTime > upperLyrics[upperLyrics.length - 1].endTime + 0.6 &&
            maxLine >= currentOddLineIndex + 2) {
            currentOddLineIndex += 2;
        }

        if (lowerLyrics.length > 0 &&
            adjustedTime > lowerLyrics[lowerLyrics.length - 1].endTime + 0.6 &&
            maxLine >= currentEvenLineIndex + 2) {
            currentEvenLineIndex += 2;
        }
    }

    /**
     * 建立單字 span 元素並返回引用（用於後續更新）
     * 使用單層漸層方案：只有一個文字元素，使用 background-clip: text + linear-gradient 實現 KTV 高亮效果
     * 這種方法完全避免了兩層對齊的問題
     * @param {object} entry - 字幕條目
     * @param {number} currentTime - 當前時間
     * @returns {{element: HTMLElement, entry: object, textEl: HTMLElement, pinyinEl: HTMLElement|null}}
     */
    function createWordSpanWithRefs(entry, currentTime) {
        const wordSpan = document.createElement('span');
        wordSpan.classList.add('yt-ktv-word');
        wordSpan.style.display = 'inline-block';
        wordSpan.style.verticalAlign = 'bottom';
        // 添加外層陰影效果，增強可讀性（不影響 background-clip: text）
        wordSpan.style.filter = 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.8))';

        // 內容容器
        const content = document.createElement('span');
        content.classList.add('yt-ktv-content');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.alignItems = 'flex-start';

        let pinyinEl = null;

        // 拼音（使用單層漸層）
        if (entry.pinyin) {
            pinyinEl = document.createElement('span');
            pinyinEl.classList.add('yt-ktv-pronunciation');
            pinyinEl.style.fontSize = (settings.fontSize * 0.4) + 'px';
            pinyinEl.style.lineHeight = '1.2';
            pinyinEl.style.whiteSpace = 'nowrap';
            // 漸層背景：左邊高亮色，右邊白色
            pinyinEl.style.background = `linear-gradient(90deg, ${settings.highlightColor} 0%, ${settings.highlightColor} 50%, white 50%, white 100%)`;
            pinyinEl.style.backgroundSize = '200% 100%';
            pinyinEl.style.backgroundPosition = '100% 0'; // 初始顯示白色
            pinyinEl.style.webkitBackgroundClip = 'text';
            pinyinEl.style.backgroundClip = 'text';
            pinyinEl.style.webkitTextFillColor = 'transparent';
            pinyinEl.style.color = 'transparent';
            pinyinEl.style.textShadow = 'none'; // 禁用 text-shadow，避免與 background-clip: text 衝突
            pinyinEl.textContent = entry.pinyin;
            content.appendChild(pinyinEl);
        }

        // 主字（使用單層漸層）
        const textEl = document.createElement('span');
        textEl.classList.add('yt-ktv-main-text');
        textEl.style.fontSize = settings.fontSize + 'px';
        textEl.style.lineHeight = '1';
        // 漸層背景：左邊高亮色，右邊白色
        textEl.style.background = `linear-gradient(90deg, ${settings.highlightColor} 0%, ${settings.highlightColor} 50%, white 50%, white 100%)`;
        textEl.style.backgroundSize = '200% 100%';
        textEl.style.backgroundPosition = '100% 0'; // 初始顯示白色
        textEl.style.webkitBackgroundClip = 'text';
        textEl.style.backgroundClip = 'text';
        textEl.style.webkitTextFillColor = 'transparent';
        textEl.style.color = 'transparent';
        textEl.style.textShadow = 'none'; // 禁用 text-shadow，避免與 background-clip: text 衝突
        textEl.innerHTML = entry.word
            .replace(/␣␣/g, '&nbsp;&nbsp;')
            .replace(/␣/g, '&nbsp;');
        content.appendChild(textEl);

        wordSpan.appendChild(content);

        // 初始動畫狀態
        animateWordHighlight(entry, textEl, currentTime);
        if (pinyinEl) {
            animateWordHighlight(entry, pinyinEl, currentTime);
        }

        return {
            element: wordSpan,
            entry: entry,
            textEl: textEl,
            pinyinEl: pinyinEl
        };
    }

    /**
     * 顯示結尾慶祝訊息
     */
    function showEndMessage() {
        if (!displayArea) return;

        displayArea.innerHTML = '';
        wordElements = [];

        // 建立上方行
        const upperLineDiv = document.createElement('div');
        upperLineDiv.classList.add('yt-ktv-line');
        upperLineDiv.style.fontSize = settings.fontSize + 'px';
        upperLineDiv.style.color = settings.highlightColor;
        upperLineDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        upperLineDiv.textContent = '☆～來賓請掌聲鼓勵～☆';

        // 建立下方行
        const lowerLineDiv = document.createElement('div');
        lowerLineDiv.classList.add('yt-ktv-line');
        lowerLineDiv.style.fontSize = settings.fontSize + 'px';
        lowerLineDiv.style.color = settings.highlightColor;
        lowerLineDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        lowerLineDiv.textContent = '☆～把酒同歡 歡樂無限～☆';

        displayArea.appendChild(upperLineDiv);
        displayArea.appendChild(lowerLineDiv);
    }

    /**
     * 啟動動畫循環
     * @param {function} getTimeFunction - 取得當前時間的函式
     */
    function startAnimationLoop(getTimeFunction) {
        getTimeFn = getTimeFunction;

        function update() {
            if (isEnabled && getTimeFn && subtitleData.length > 0) {
                updateDisplay(getTimeFn());
            }
            animationFrameId = requestAnimationFrame(update);
        }

        update();
    }

    /**
     * 停止動畫循環
     */
    function stopAnimationLoop() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    /**
     * 設定啟用狀態
     * @param {boolean} enabled - 是否啟用
     */
    function setEnabled(enabled) {
        isEnabled = enabled;

        if (container) {
            container.style.display = enabled ? 'block' : 'none';
        }

        if (!enabled && displayArea) {
            displayArea.innerHTML = '';
        }
    }

    /**
     * 取得啟用狀態
     * @returns {boolean}
     */
    function getEnabled() {
        return isEnabled;
    }

    /**
     * 重新定位覆蓋層（用於全螢幕切換）
     * @param {boolean} isFullscreen - 是否為全螢幕
     * @param {HTMLElement} newParent - 新的父元素
     */
    function repositionForFullscreen(isFullscreen, newParent) {
        if (!container) {
            return;
        }

        if (isFullscreen && newParent) {
            newParent.appendChild(container);
            container.classList.add('yt-ktv-fullscreen');
        } else {
            container.classList.remove('yt-ktv-fullscreen');
            // 移回 movie_player
            const moviePlayer = document.querySelector('#movie_player');
            if (moviePlayer && container.parentElement !== moviePlayer) {
                moviePlayer.appendChild(container);
            }
        }
    }

    /**
     * 重置狀態
     */
    function reset() {
        subtitleData = [];
        currentOddLineIndex = 1;
        currentEvenLineIndex = 2;
        lastUpdateTime = 0;
        cachedUpperLineIndex = -1;
        cachedLowerLineIndex = -1;
        wordElements = [];
        isShowingEndMessage = false;
        clearAllTimeouts();

        if (displayArea) {
            displayArea.innerHTML = '';
        }
    }

    /**
     * 銷毀覆蓋層
     */
    function destroy() {
        stopAnimationLoop();
        clearAllTimeouts();

        if (container) {
            container.remove();
            container = null;
            displayArea = null;
        }

        subtitleData = [];
        wordElements = [];
        cachedUpperLineIndex = -1;
        cachedLowerLineIndex = -1;
        getTimeFn = null;
    }

    // 導出 API
    return {
        createOverlayContainer,
        getContainer,
        setSubtitleData,
        getSubtitleData,
        updateSettings,
        getSettings,
        updateDisplay,
        startAnimationLoop,
        stopAnimationLoop,
        setEnabled,
        getEnabled,
        repositionForFullscreen,
        reset,
        destroy
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LyricsOverlay;
}

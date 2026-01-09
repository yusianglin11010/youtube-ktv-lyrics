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
        // 重置行索引
        currentOddLineIndex = 1;
        currentEvenLineIndex = 2;
        lastUpdateTime = 0;

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
     * 建立單字 span 元素
     * @param {object} entry - 字幕條目
     * @param {number} currentTime - 當前時間
     * @returns {HTMLElement}
     */
    function createWordSpan(entry, currentTime) {
        const wordSpan = document.createElement('span');
        wordSpan.classList.add('yt-ktv-word');

        // 主容器
        const mainTextWrapper = document.createElement('span');
        mainTextWrapper.classList.add('yt-ktv-main-text-wrapper');
        mainTextWrapper.style.position = 'relative';
        mainTextWrapper.style.display = 'inline-flex';

        // === 底層 stacked（拼音 + 主字）===
        const stacked = document.createElement('span');
        stacked.classList.add('yt-ktv-stacked');
        stacked.style.display = 'inline-flex';
        stacked.style.flexDirection = 'column';
        stacked.style.alignItems = 'center';
        stacked.style.marginRight = '4px';
        stacked.style.position = 'relative';
        stacked.style.verticalAlign = 'bottom';

        // 拼音底層（如果有）
        if (entry.pinyin) {
            const pronunciationBase = document.createElement('span');
            pronunciationBase.classList.add('yt-ktv-pronunciation');
            pronunciationBase.style.fontSize = (settings.fontSize * 0.4) + 'px';
            pronunciationBase.style.lineHeight = '1.2';
            pronunciationBase.style.color = 'rgba(255, 255, 255, 0.8)';
            pronunciationBase.style.whiteSpace = 'nowrap';
            pronunciationBase.style.textShadow = '1px 1px 3px rgba(0, 0, 0, 0.8)';
            pronunciationBase.textContent = entry.pinyin;
            stacked.appendChild(pronunciationBase);
        }

        // 主字底層
        const baseText = document.createElement('span');
        baseText.classList.add('yt-ktv-base-text');
        baseText.style.fontSize = settings.fontSize + 'px';
        baseText.style.lineHeight = '1';
        baseText.innerHTML = entry.word
            .replace(/␣␣/g, '&nbsp;&nbsp;')
            .replace(/␣/g, '&nbsp;');
        stacked.appendChild(baseText);

        mainTextWrapper.appendChild(stacked);

        // === 高亮層 wrapper（absolute 覆蓋）===
        const highlightWrapper = document.createElement('span');
        highlightWrapper.classList.add('yt-ktv-highlight-wrapper');
        highlightWrapper.style.display = 'flex';
        highlightWrapper.style.flexDirection = 'column';
        highlightWrapper.style.alignItems = 'center';
        highlightWrapper.style.position = 'absolute';
        highlightWrapper.style.top = '0';
        highlightWrapper.style.left = '0';
        highlightWrapper.style.width = '100%';

        let pinyinHighlight = null;

        // 拼音高亮層（如果有）
        if (entry.pinyin) {
            pinyinHighlight = document.createElement('span');
            pinyinHighlight.classList.add('yt-ktv-pronunciation', 'highlight');
            pinyinHighlight.style.fontSize = (settings.fontSize * 0.4) + 'px';
            pinyinHighlight.style.lineHeight = '1.2';
            pinyinHighlight.style.whiteSpace = 'nowrap';
            pinyinHighlight.style.overflow = 'hidden';
            pinyinHighlight.style.clipPath = 'inset(0 100% 0 0)';
            pinyinHighlight.textContent = entry.pinyin;
            highlightWrapper.appendChild(pinyinHighlight);
        }

        // 主字高亮層
        const highlightText = document.createElement('span');
        highlightText.classList.add('yt-ktv-highlight-text');
        highlightText.style.fontSize = settings.fontSize + 'px';
        highlightText.style.lineHeight = '1';
        highlightText.style.clipPath = 'inset(0 100% 0 0)';
        highlightText.innerHTML = entry.word
            .replace(/␣␣/g, '&nbsp;&nbsp;')
            .replace(/␣/g, '&nbsp;');
        highlightWrapper.appendChild(highlightText);

        mainTextWrapper.appendChild(highlightWrapper);
        wordSpan.appendChild(mainTextWrapper);

        // 啟動動畫（主字幕和拼音同步）
        animateWordHighlight(entry, highlightText, currentTime);
        if (pinyinHighlight) {
            animateWordHighlight(entry, pinyinHighlight, currentTime);
        }

        return wordSpan;
    }

    /**
     * 單字高亮動畫
     * @param {object} entry - 字幕條目
     * @param {HTMLElement} highlightText - 高亮層元素
     * @param {number} currentTime - 當前時間
     */
    function animateWordHighlight(entry, highlightText, currentTime) {
        const totalDuration = entry.endTime - entry.startTime;
        const elapsedTime = Math.max(0, currentTime - entry.startTime);
        const progress = Math.min(1, elapsedTime / totalDuration);

        // 套用 clip-path 動畫（由左至右）
        highlightText.style.clipPath = `inset(0 ${100 - progress * 100}% 0 0)`;
        highlightText.style.color = settings.highlightColor;
        highlightText.style.textShadow = `2px 2px 5px ${settings.shadowColor}`;

        // 如果動畫尚未完成，繼續更新
        if (progress < 1 && isEnabled && getTimeFn) {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    if (highlightText.isConnected) {
                        animateWordHighlight(entry, highlightText, getTimeFn());
                    }
                });
            }, 20); // 每 20ms 更新一次
        }
    }

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

        // 清空顯示區域
        displayArea.innerHTML = '';

        // 獲取字幕的最大行數
        const maxLine = Math.max(...subtitleData.map(entry => entry.line));

        // 找到當前時間對應的行數
        const activeLines = new Set();
        let minFutureEntry = null;

        subtitleData.forEach(entry => {
            if (adjustedTime >= entry.startTime && adjustedTime <= entry.endTime) {
                activeLines.add(entry.line);
            }
            if (entry.startTime >= adjustedTime &&
                (minFutureEntry === null || entry.startTime < minFutureEntry.startTime)) {
                minFutureEntry = entry;
            }
        });

        // 若當前時間未匹配任何行，則使用最接近的未來字幕行
        if (activeLines.size === 0 && minFutureEntry) {
            activeLines.add(minFutureEntry.line);
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
            upperLineDiv.appendChild(createWordSpan(entry, adjustedTime));
        });

        // 填充下方行
        lowerLyrics.forEach(entry => {
            lowerLineDiv.appendChild(createWordSpan(entry, adjustedTime));
        });

        displayArea.appendChild(upperLineDiv);
        displayArea.appendChild(lowerLineDiv);

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

        if (displayArea) {
            displayArea.innerHTML = '';
        }
    }

    /**
     * 銷毀覆蓋層
     */
    function destroy() {
        stopAnimationLoop();

        if (container) {
            container.remove();
            container = null;
            displayArea = null;
        }

        subtitleData = [];
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

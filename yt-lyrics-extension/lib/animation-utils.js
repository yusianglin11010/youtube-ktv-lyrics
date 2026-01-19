// ⚠️ AUTO-SYNCED from yt-lyrics-html/lib - DO NOT EDIT DIRECTLY
// To modify this file, edit yt-lyrics-html/lib/animation-utils.js and run: npm run sync-libs

/**
 * YouTube KTV Lyrics - Animation Utilities Module
 * 動畫工具模組
 */

const AnimationUtils = (function() {
    'use strict';

    /**
     * 計算動畫進度（0-1）
     * @param {object} entry - 字幕條目，需包含 startTime 和 endTime
     * @param {number} currentTime - 當前時間（秒）
     * @returns {number} 進度值（0-1）
     */
    function calculateProgress(entry, currentTime) {
        const totalDuration = entry.endTime - entry.startTime;
        if (totalDuration <= 0) {
            return 1;
        }
        const elapsedTime = Math.max(0, currentTime - entry.startTime);
        return Math.min(1, elapsedTime / totalDuration);
    }

    /**
     * 判斷是否該換行
     * @param {number} currentTime - 當前時間（秒）
     * @param {number} lastEntryEndTime - 最後一個字幕的結束時間
     * @param {number} [threshold=0.6] - 換行延遲閾值（秒）
     * @returns {boolean} 是否該換行
     */
    function shouldAdvanceLine(currentTime, lastEntryEndTime, threshold) {
        threshold = threshold || 0.6;
        return currentTime >= lastEntryEndTime + threshold;
    }

    /**
     * 偵測快速拖動（用於重置動畫狀態）
     * @param {number} currentTime - 當前時間（秒）
     * @param {number} lastTime - 上次更新時間（秒）
     * @param {number} [threshold=0.5] - 快進快退閾值（秒）
     * @returns {boolean} 是否發生快進快退
     */
    function detectFastSeek(currentTime, lastTime, threshold) {
        threshold = threshold || 0.5;
        return Math.abs(currentTime - lastTime) > threshold;
    }

    /**
     * 二分搜尋找到當前時間點的 entry 索引
     * @param {Array} entries - 字幕條目陣列
     * @param {number} currentTime - 當前時間（秒）
     * @returns {number} entry 索引，找不到返回 -1
     */
    function findCurrentEntryIndex(entries, currentTime) {
        if (!entries || entries.length === 0) {
            return -1;
        }

        let left = 0;
        let right = entries.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const entry = entries[mid];

            if (currentTime >= entry.startTime && currentTime < entry.endTime) {
                return mid;
            } else if (currentTime < entry.startTime) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return -1;
    }

    /**
     * 找到最近的 entry（用於快進快退後定位）
     * @param {Array} entries - 字幕條目陣列
     * @param {number} currentTime - 當前時間（秒）
     * @returns {object|null} 最近的 entry 或 null
     */
    function findNearestEntry(entries, currentTime) {
        if (!entries || entries.length === 0) {
            return null;
        }

        // 先找當前正在播放的
        const currentIndex = findCurrentEntryIndex(entries, currentTime);
        if (currentIndex >= 0) {
            return entries[currentIndex];
        }

        // 找下一個即將播放的
        const nextEntry = entries.find(entry => entry.startTime >= currentTime);
        if (nextEntry) {
            return nextEntry;
        }

        // 都沒有就返回最後一個
        return entries[entries.length - 1];
    }

    /**
     * 建立漸層背景樣式（統一動畫方式）
     * @param {string} highlightColor - 高亮顏色
     * @param {string} [baseColor='white'] - 基礎顏色
     * @returns {string} CSS 漸層樣式
     */
    function createGradientStyle(highlightColor, baseColor) {
        baseColor = baseColor || 'white';
        return `linear-gradient(90deg, ${highlightColor} 0%, ${highlightColor} 50%, ${baseColor} 50%, ${baseColor} 100%)`;
    }

    /**
     * 計算背景位置（根據進度）
     * 用於控制漸層填充效果
     * @param {number} progress - 進度值（0-1）
     * @returns {number} 背景位置百分比（100-0）
     */
    function calculateBackgroundPosition(progress) {
        return (1 - progress) * 100;
    }

    /**
     * 套用動畫樣式到元素
     * @param {HTMLElement} element - 目標元素
     * @param {object} entry - 字幕條目
     * @param {number} currentTime - 當前時間（秒）
     */
    function applyAnimationToElement(element, entry, currentTime) {
        const progress = calculateProgress(entry, currentTime);
        const bgPosition = calculateBackgroundPosition(progress);
        element.style.backgroundPosition = `${bgPosition}% 0`;
    }

    /**
     * 初始化元素的漸層動畫樣式
     * @param {HTMLElement} element - 目標元素
     * @param {string} highlightColor - 高亮顏色
     * @param {string} [baseColor='white'] - 基礎顏色
     */
    function initGradientAnimation(element, highlightColor, baseColor) {
        baseColor = baseColor || 'white';
        element.style.background = createGradientStyle(highlightColor, baseColor);
        element.style.backgroundSize = '200% 100%';
        element.style.backgroundPosition = '100% 0';
        element.style.webkitBackgroundClip = 'text';
        element.style.backgroundClip = 'text';
        element.style.webkitTextFillColor = 'transparent';
        element.style.color = 'transparent';
        element.style.textShadow = 'none';
    }

    return {
        calculateProgress,
        shouldAdvanceLine,
        detectFastSeek,
        findCurrentEntryIndex,
        findNearestEntry,
        createGradientStyle,
        calculateBackgroundPosition,
        applyAnimationToElement,
        initGradientAnimation
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationUtils;
}

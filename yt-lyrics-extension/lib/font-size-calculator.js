/**
 * YouTube KTV Lyrics Extension - Font Size Calculator Module
 * 字體大小計算模組 - 根據容器寬度動態計算字體大小,防止 overflow
 */

const FontSizeCalculator = (function() {
    'use strict';

    // 常數設定
    const BASE_SIZE_FACTOR = 0.043;          // containerWidth * this = baseSize
    const MIN_BASE_SIZE = 18;                // 最小基準字體大小
    const MAX_BASE_SIZE = 60;                // 最大基準字體大小
    const AVG_CHAR_WIDTH_RATIO = 0.75;       // 平均字元寬度比例 (相對於字體大小)
    const SPACING_BUFFER = 0.85;             // 間距緩衝區 (15% 保留空間)
    const CONTAINER_WIDTH_RATIO = 0.9;       // 容器可用寬度比例

    /**
     * 計算基準字體大小 (100% 時的字體)
     * @param {number} containerWidth - 容器寬度 (px)
     * @returns {number} 基準字體大小 (px)
     */
    function calculateBaseSize(containerWidth) {
        const calculated = containerWidth * BASE_SIZE_FACTOR;
        return Math.max(MIN_BASE_SIZE, Math.min(MAX_BASE_SIZE, calculated));
    }

    /**
     * 計算實際字體大小
     * @param {number} percentage - 使用者選擇的百分比 (70-150)
     * @param {number} containerWidth - 容器寬度 (px)
     * @returns {number} 實際字體大小 (px)
     */
    function calculateActualSize(percentage, containerWidth) {
        const baseSize = calculateBaseSize(containerWidth);
        return baseSize * (percentage / 100);
    }

    /**
     * 取得最長行的字元數
     * @param {Array} subtitleData - 字幕資料陣列
     * @returns {number} 最長行的字元數
     */
    function getLongestLineCharCount(subtitleData) {
        if (!subtitleData || subtitleData.length === 0) return 30; // 預設值

        const longestLine = Math.max(...subtitleData.map(entry => {
            const word = entry.word || '';
            // 移除空格符號 ␣ 來計算實際字元數
            return word.replace(/␣/g, '').length;
        }), 30); // 至少 30 字元

        return longestLine;
    }

    /**
     * 計算最大安全字體大小 (防止 overflow)
     * @param {number} containerWidth - 容器寬度 (px)
     * @param {number} longestLineCharCount - 最長行的字元數
     * @returns {number} 最大安全字體大小 (px)
     */
    function calculateMaxSafeSize(containerWidth, longestLineCharCount) {
        const availableWidth = containerWidth * CONTAINER_WIDTH_RATIO;
        const maxFontSize = (availableWidth / longestLineCharCount / AVG_CHAR_WIDTH_RATIO) * SPACING_BUFFER;
        return maxFontSize;
    }

    /**
     * 取得安全的字體大小 (考慮 overflow 限制)
     * @param {number} percentage - 使用者選擇的百分比 (70-150)
     * @param {number} containerWidth - 容器寬度 (px)
     * @param {Array} subtitleData - 字幕資料陣列
     * @returns {number} 安全的字體大小 (px)
     */
    function getSafeFontSize(percentage, containerWidth, subtitleData) {
        // 計算使用者要求的大小
        const requestedSize = calculateActualSize(percentage, containerWidth);

        // 計算最長行
        const longestLine = getLongestLineCharCount(subtitleData);

        // 計算最大安全大小
        const maxSafeSize = calculateMaxSafeSize(containerWidth, longestLine);

        // 返回較小的值 (確保不 overflow)
        return Math.min(requestedSize, maxSafeSize);
    }

    /**
     * 取得容器寬度 (含 fallback)
     * @param {HTMLElement} element - 容器元素
     * @returns {number} 容器寬度 (px)
     */
    function getContainerWidth(element) {
        if (!element) return 800; // Fallback 預設值

        // 嘗試多種方式取得寬度
        const width = element.clientWidth || element.offsetWidth || element.getBoundingClientRect().width;

        // 確保有合理的值
        return width > 0 ? width : 800;
    }

    // 導出 API
    return {
        calculateBaseSize,
        calculateActualSize,
        getSafeFontSize,
        getContainerWidth,
        calculateMaxSafeSize,
        getLongestLineCharCount
    };
})();

// 支援 Node.js 環境 (用於測試)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontSizeCalculator;
}

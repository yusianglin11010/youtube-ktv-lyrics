// ⚠️ AUTO-SYNCED from yt-lyrics-html/lib - DO NOT EDIT DIRECTLY
// To modify this file, edit yt-lyrics-html/lib/constants.js and run: npm run sync-libs

/**
 * YouTube KTV Lyrics - Constants Module
 * 共用常數模組
 */

const Constants = (function() {
    'use strict';

    // 角色顏色配置
    const ROLE_COLORS = {
        '1': '#FF6B9D',  // 男聲 - 粉紅
        '2': '#98FB98',  // 女聲 - 淺綠
        '3': '#FFD700'   // 合聲 - 金黃
    };

    // 預設樣式
    const DEFAULT_HIGHLIGHT_COLOR = '#80D9E5';
    const DEFAULT_SHADOW_COLOR = '#1D1B1B';
    const DEFAULT_FONT = 'NotoSans';
    const DEFAULT_FONT_SIZE = 40;  // 保留用於向後相容和遷移計算

    // 百分比字體大小設定
    const DEFAULT_FONT_SIZE_PERCENTAGE = 100;
    const MIN_FONT_SIZE_PERCENTAGE = 70;
    const MAX_FONT_SIZE_PERCENTAGE = 150;

    // 動畫參數
    const LINE_ADVANCE_THRESHOLD = 0.6;  // 換行延遲（秒）
    const BUFFER_CIRCLE_GAP = 4;         // 插入緩衝圓點的間隔（秒）
    const PINYIN_FONT_SCALE = 0.4;       // 拼音字體縮放比例（40%）
    const FAST_SEEK_THRESHOLD = 0.5;     // 快進快退偵測閾值（秒）

    // 結尾訊息
    const END_MESSAGE_DELAY = 1.5;       // 歌曲結束後顯示訊息的延遲（秒）
    const END_MESSAGE_UPPER = '☆～來賓請掌聲鼓勵～☆';
    const END_MESSAGE_LOWER = '☆～把酒同歡 歡樂無限～☆';

    // 預設設定（完整）
    const DEFAULT_SETTINGS = {
        font: DEFAULT_FONT,
        fontSize: DEFAULT_FONT_SIZE,  // 保留用於向後相容
        fontSizePercentage: DEFAULT_FONT_SIZE_PERCENTAGE,  // 新的百分比設定
        highlightColor: DEFAULT_HIGHLIGHT_COLOR,
        shadowColor: DEFAULT_SHADOW_COLOR,
        timeOffset: 0,
        roleColors: { ...ROLE_COLORS }
    };

    return {
        // 角色顏色
        ROLE_COLORS,

        // 預設樣式
        DEFAULT_HIGHLIGHT_COLOR,
        DEFAULT_SHADOW_COLOR,
        DEFAULT_FONT,
        DEFAULT_FONT_SIZE,

        // 百分比字體大小
        DEFAULT_FONT_SIZE_PERCENTAGE,
        MIN_FONT_SIZE_PERCENTAGE,
        MAX_FONT_SIZE_PERCENTAGE,

        // 動畫參數
        LINE_ADVANCE_THRESHOLD,
        BUFFER_CIRCLE_GAP,
        PINYIN_FONT_SCALE,
        FAST_SEEK_THRESHOLD,

        // 結尾訊息
        END_MESSAGE_DELAY,
        END_MESSAGE_UPPER,
        END_MESSAGE_LOWER,

        // 完整預設設定
        DEFAULT_SETTINGS
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
}

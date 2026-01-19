/**
 * YouTube KTV Lyrics Extension - Storage Module
 * Chrome Extension 儲存模組
 */

const Storage = (function() {
    'use strict';

    // 預設設定值
    const DEFAULT_SETTINGS = {
        font: 'NotoSans',
        fontSize: 40,  // 保留用於向後相容
        fontSizePercentage: 100,  // 新的百分比設定
        highlightColor: '#80D9E5',
        shadowColor: '#1D1B1B',
        timeOffset: 0,
        roleColors: {
            '1': '#FF6B9D',  // 男聲 - 粉紅
            '2': '#98FB98',  // 女聲 - 淺綠
            '3': '#FFD700'   // 合聲 - 金黃
        }
    };

    /**
     * 取得使用者設定
     * @returns {Promise<object>} 設定物件
     */
    async function getSettings() {
        try {
            const result = await chrome.storage.sync.get('settings');
            let settings = result.settings || { ...DEFAULT_SETTINGS };

            // 資料遷移邏輯: 將舊的 px 設定轉換為百分比
            if (settings.fontSizePercentage === undefined && settings.fontSize !== undefined) {
                // 舊資料: 40px = 100%, 比例換算
                settings.fontSizePercentage = Math.round((settings.fontSize / 40) * 100);
                // 限制在合理範圍 70-150%
                settings.fontSizePercentage = Math.max(70, Math.min(150, settings.fontSizePercentage));
                settings._migrated = true;

                // 立即儲存遷移後的設定
                await saveSettings(settings);
                console.log(`Font size migrated: ${settings.fontSize}px → ${settings.fontSizePercentage}%`);
            }

            return settings;
        } catch (error) {
            console.error('Failed to get settings:', error);
            return { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * 儲存使用者設定
     * @param {object} settings - 設定物件
     * @returns {Promise<boolean>} 是否成功
     */
    async function saveSettings(settings) {
        try {
            await chrome.storage.sync.set({ settings });
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    /**
     * 更新部分設定
     * @param {object} partialSettings - 要更新的設定
     * @returns {Promise<boolean>} 是否成功
     */
    async function updateSettings(partialSettings) {
        const currentSettings = await getSettings();
        const newSettings = { ...currentSettings, ...partialSettings };
        return saveSettings(newSettings);
    }

    /**
     * 取得字幕啟用狀態
     * @returns {Promise<boolean>} 是否啟用
     */
    async function getEnabled() {
        try {
            const result = await chrome.storage.sync.get('enabled');
            return result.enabled !== false; // 預設為啟用
        } catch (error) {
            console.error('Failed to get enabled state:', error);
            return true;
        }
    }

    /**
     * 設定字幕啟用狀態
     * @param {boolean} enabled - 是否啟用
     * @returns {Promise<boolean>} 是否成功
     */
    async function setEnabled(enabled) {
        try {
            await chrome.storage.sync.set({ enabled });
            return true;
        } catch (error) {
            console.error('Failed to set enabled state:', error);
            return false;
        }
    }

    /**
     * 儲存字幕資料
     * @param {string} videoId - YouTube 影片 ID
     * @param {string} title - 歌曲標題
     * @param {string} url - 影片 URL
     * @param {Array} data - 字幕資料陣列
     * @returns {Promise<boolean>} 是否成功
     */
    async function saveSubtitle(videoId, title, url, data) {
        if (!videoId || !data || !Array.isArray(data)) {
            console.error('Invalid subtitle data');
            return false;
        }

        try {
            const entry = {
                videoId,
                title: title || 'Untitled',
                url: url || `https://www.youtube.com/watch?v=${videoId}`,
                uploadedAt: Date.now(),
                data
            };

            // 儲存字幕資料
            await chrome.storage.local.set({ [`subtitle_${videoId}`]: entry });

            // 更新索引
            await updateSubtitleIndex(videoId, title);

            return true;
        } catch (error) {
            console.error('Failed to save subtitle:', error);
            return false;
        }
    }

    /**
     * 更新字幕索引
     * @param {string} videoId - YouTube 影片 ID
     * @param {string} title - 歌曲標題
     */
    async function updateSubtitleIndex(videoId, title) {
        try {
            const result = await chrome.storage.local.get('subtitleIndex');
            const index = result.subtitleIndex || [];

            // 檢查是否已存在
            const existingIdx = index.findIndex(item => item.videoId === videoId);
            const indexEntry = {
                videoId,
                title: title || 'Untitled',
                uploadedAt: Date.now()
            };

            if (existingIdx >= 0) {
                index[existingIdx] = indexEntry;
            } else {
                index.push(indexEntry);
            }

            // 依上傳時間排序（最新的在前）
            index.sort((a, b) => b.uploadedAt - a.uploadedAt);

            await chrome.storage.local.set({ subtitleIndex: index });
        } catch (error) {
            console.error('Failed to update subtitle index:', error);
        }
    }

    /**
     * 取得指定影片的字幕
     * @param {string} videoId - YouTube 影片 ID
     * @returns {Promise<object|null>} 字幕資料或 null
     */
    async function getSubtitle(videoId) {
        if (!videoId) {
            return null;
        }

        try {
            const result = await chrome.storage.local.get(`subtitle_${videoId}`);
            return result[`subtitle_${videoId}`] || null;
        } catch (error) {
            console.error('Failed to get subtitle:', error);
            return null;
        }
    }

    /**
     * 檢查指定影片是否有字幕
     * @param {string} videoId - YouTube 影片 ID
     * @returns {Promise<boolean>} 是否有字幕
     */
    async function hasSubtitle(videoId) {
        const subtitle = await getSubtitle(videoId);
        return subtitle !== null;
    }

    /**
     * 刪除指定影片的字幕
     * @param {string} videoId - YouTube 影片 ID
     * @returns {Promise<boolean>} 是否成功
     */
    async function deleteSubtitle(videoId) {
        if (!videoId) {
            return false;
        }

        try {
            // 刪除字幕資料
            await chrome.storage.local.remove(`subtitle_${videoId}`);

            // 更新索引
            const result = await chrome.storage.local.get('subtitleIndex');
            const index = result.subtitleIndex || [];
            const newIndex = index.filter(item => item.videoId !== videoId);
            await chrome.storage.local.set({ subtitleIndex: newIndex });

            return true;
        } catch (error) {
            console.error('Failed to delete subtitle:', error);
            return false;
        }
    }

    /**
     * 取得所有字幕索引
     * @returns {Promise<Array>} 字幕索引陣列
     */
    async function getAllSubtitles() {
        try {
            const result = await chrome.storage.local.get('subtitleIndex');
            return result.subtitleIndex || [];
        } catch (error) {
            console.error('Failed to get all subtitles:', error);
            return [];
        }
    }

    /**
     * 取得字幕數量
     * @returns {Promise<number>} 字幕數量
     */
    async function getSubtitleCount() {
        const index = await getAllSubtitles();
        return index.length;
    }

    /**
     * 清除所有字幕
     * @returns {Promise<boolean>} 是否成功
     */
    async function clearAllSubtitles() {
        try {
            const index = await getAllSubtitles();

            // 刪除所有字幕資料
            const keysToRemove = index.map(item => `subtitle_${item.videoId}`);
            keysToRemove.push('subtitleIndex');

            await chrome.storage.local.remove(keysToRemove);
            return true;
        } catch (error) {
            console.error('Failed to clear all subtitles:', error);
            return false;
        }
    }

    /**
     * 取得儲存空間使用量
     * @returns {Promise<object>} { used: number, total: number, percentage: number }
     */
    async function getStorageUsage() {
        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse(null);
            // Chrome storage.local 預設上限約 5MB，但可透過 unlimitedStorage 權限增加
            const totalBytes = 5 * 1024 * 1024; // 5MB

            return {
                used: bytesInUse,
                total: totalBytes,
                percentage: Math.round((bytesInUse / totalBytes) * 100)
            };
        } catch (error) {
            console.error('Failed to get storage usage:', error);
            return { used: 0, total: 5 * 1024 * 1024, percentage: 0 };
        }
    }

    /**
     * 搜尋字幕（依標題）
     * @param {string} query - 搜尋關鍵字
     * @returns {Promise<Array>} 符合的字幕索引
     */
    async function searchSubtitles(query) {
        if (!query || typeof query !== 'string') {
            return getAllSubtitles();
        }

        const index = await getAllSubtitles();
        const lowerQuery = query.toLowerCase();

        return index.filter(item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.videoId.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 監聽儲存變更
     * @param {function} callback - 回調函式 (changes, areaName)
     * @returns {function} 移除監聽器的函式
     */
    function onStorageChange(callback) {
        const listener = (changes, areaName) => {
            callback(changes, areaName);
        };
        chrome.storage.onChanged.addListener(listener);

        // 返回移除監聽器的函式
        return () => chrome.storage.onChanged.removeListener(listener);
    }

    // 導出 API
    return {
        // 設定相關
        getSettings,
        saveSettings,
        updateSettings,
        getEnabled,
        setEnabled,
        DEFAULT_SETTINGS,

        // 字幕相關
        saveSubtitle,
        getSubtitle,
        hasSubtitle,
        deleteSubtitle,
        getAllSubtitles,
        getSubtitleCount,
        clearAllSubtitles,
        searchSubtitles,

        // 儲存空間
        getStorageUsage,

        // 事件監聽
        onStorageChange
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}

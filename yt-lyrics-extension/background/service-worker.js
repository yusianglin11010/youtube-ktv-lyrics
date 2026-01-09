/**
 * YouTube KTV Lyrics Extension - Background Service Worker
 */

// 安裝時初始化
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[YT-KTV] Extension installed:', details.reason);

    // 設定預設值
    if (details.reason === 'install') {
        chrome.storage.sync.set({
            enabled: true,
            settings: {
                font: 'NotoSans',
                fontSize: 40,
                highlightColor: '#80D9E5',
                shadowColor: '#1D1B1B',
                timeOffset: 0
            }
        });

        chrome.storage.local.set({
            subtitleIndex: []
        });
    }
});

// 監聽來自 content script 和 popup 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // 保持訊息通道開放
});

/**
 * 處理訊息
 */
async function handleMessage(message, sender, sendResponse) {
    try {
        switch (message.action) {
            case 'GET_SUBTITLE':
                const subtitle = await getSubtitle(message.videoId);
                sendResponse({ success: true, data: subtitle });
                break;

            case 'SAVE_SUBTITLE':
                await saveSubtitle(message.videoId, message.data);
                sendResponse({ success: true });
                break;

            case 'DELETE_SUBTITLE':
                await deleteSubtitle(message.videoId);
                sendResponse({ success: true });
                break;

            case 'GET_ALL_SUBTITLES':
                const subtitles = await getAllSubtitles();
                sendResponse({ success: true, data: subtitles });
                break;

            case 'GET_STORAGE_USAGE':
                const usage = await getStorageUsage();
                sendResponse({ success: true, data: usage });
                break;

            default:
                // 如果不是 action 類型的訊息，可能是其他類型，忽略
                break;
        }
    } catch (error) {
        console.error('[YT-KTV] Error handling message:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * 取得字幕
 */
async function getSubtitle(videoId) {
    if (!videoId) return null;
    const result = await chrome.storage.local.get(`subtitle_${videoId}`);
    return result[`subtitle_${videoId}`] || null;
}

/**
 * 儲存字幕
 */
async function saveSubtitle(videoId, data) {
    if (!videoId || !data) return;

    await chrome.storage.local.set({ [`subtitle_${videoId}`]: data });

    // 更新索引
    const result = await chrome.storage.local.get('subtitleIndex');
    const index = result.subtitleIndex || [];

    const existingIdx = index.findIndex(item => item.videoId === videoId);
    const indexEntry = {
        videoId: data.videoId,
        title: data.title,
        uploadedAt: data.uploadedAt || Date.now()
    };

    if (existingIdx >= 0) {
        index[existingIdx] = indexEntry;
    } else {
        index.push(indexEntry);
    }

    index.sort((a, b) => b.uploadedAt - a.uploadedAt);
    await chrome.storage.local.set({ subtitleIndex: index });
}

/**
 * 刪除字幕
 */
async function deleteSubtitle(videoId) {
    if (!videoId) return;

    await chrome.storage.local.remove(`subtitle_${videoId}`);

    const result = await chrome.storage.local.get('subtitleIndex');
    const index = result.subtitleIndex || [];
    const newIndex = index.filter(item => item.videoId !== videoId);
    await chrome.storage.local.set({ subtitleIndex: newIndex });
}

/**
 * 取得所有字幕索引
 */
async function getAllSubtitles() {
    const result = await chrome.storage.local.get('subtitleIndex');
    return result.subtitleIndex || [];
}

/**
 * 取得儲存空間使用量
 */
async function getStorageUsage() {
    const bytesInUse = await chrome.storage.local.getBytesInUse(null);
    const totalBytes = 5 * 1024 * 1024; // 5MB

    return {
        used: bytesInUse,
        total: totalBytes,
        percentage: Math.round((bytesInUse / totalBytes) * 100)
    };
}

// 監聽 tab 更新，用於更新 badge
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
        // 提取 video ID
        const url = new URL(tab.url);
        const videoId = url.searchParams.get('v');

        if (videoId) {
            // 檢查是否有字幕
            const subtitle = await getSubtitle(videoId);

            if (subtitle) {
                // 有字幕時顯示綠色 badge
                chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId });
                chrome.action.setBadgeText({ text: '✓', tabId });
            } else {
                // 無字幕時清除 badge
                chrome.action.setBadgeText({ text: '', tabId });
            }
        }
    }
});

// 監聽 tab 切換
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);

        if (tab.url && tab.url.includes('youtube.com/watch')) {
            const url = new URL(tab.url);
            const videoId = url.searchParams.get('v');

            if (videoId) {
                const subtitle = await getSubtitle(videoId);

                if (subtitle) {
                    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: activeInfo.tabId });
                    chrome.action.setBadgeText({ text: '✓', tabId: activeInfo.tabId });
                } else {
                    chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
                }
            }
        } else {
            chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
        }
    } catch (error) {
        // Tab 可能已關閉
    }
});

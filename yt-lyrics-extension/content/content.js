/**
 * YouTube KTV Lyrics Extension - Content Script Entry Point
 * Content Script 主入口
 */

(function() {
    'use strict';

    // 避免重複初始化
    if (window.__ytKtvLyricsInitialized) {
        return;
    }
    window.__ytKtvLyricsInitialized = true;

    // 狀態變數
    let isInitialized = false;
    let currentSubtitle = null;

    /**
     * 初始化 Extension
     */
    async function init() {
        if (isInitialized) {
            return;
        }

        try {
            // 初始化 YouTube 偵測器
            YouTubeDetector.init();

            // 等待 movie_player 出現
            const moviePlayer = await YouTubeDetector.waitForMoviePlayer();

            // 建立歌詞覆蓋層
            LyricsOverlay.createOverlayContainer(moviePlayer);

            // 載入設定
            await loadSettings();

            // 啟動動畫循環
            LyricsOverlay.startAnimationLoop(() => YouTubeDetector.getCurrentTime());

            // 註冊事件處理
            registerEventHandlers();

            // 檢查當前影片是否有字幕
            await checkCurrentVideo();

            isInitialized = true;
            console.log('[YT-KTV] Extension initialized');
        } catch (error) {
            console.error('[YT-KTV] Failed to initialize:', error);
        }
    }

    /**
     * 載入設定
     */
    async function loadSettings() {
        try {
            const settings = await Storage.getSettings();
            LyricsOverlay.updateSettings(settings);

            const enabled = await Storage.getEnabled();
            LyricsOverlay.setEnabled(enabled);
        } catch (error) {
            console.error('[YT-KTV] Failed to load settings:', error);
        }
    }

    /**
     * 註冊事件處理器
     */
    function registerEventHandlers() {
        // 影片變更事件
        YouTubeDetector.on('video-changed', handleVideoChange);

        // 全螢幕變更事件
        YouTubeDetector.on('fullscreen-changed', handleFullscreenChange);

        // 監聽來自 Popup 的訊息
        chrome.runtime.onMessage.addListener(handleMessage);

        // 監聯儲存變更
        Storage.onStorageChange(handleStorageChange);

        // 頁面可見性變化
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    /**
     * 處理影片變更
     */
    async function handleVideoChange(data) {
        const { videoId, hasVideo } = data;

        console.log('[YT-KTV] Video changed:', videoId);

        if (!hasVideo || !videoId) {
            LyricsOverlay.reset();
            currentSubtitle = null;
            notifyPopup({ type: 'VIDEO_STATUS', hasSubtitle: false, videoId: null });
            return;
        }

        // 檢查是否有對應字幕
        await loadSubtitleForVideo(videoId);
    }

    /**
     * 載入指定影片的字幕
     */
    async function loadSubtitleForVideo(videoId) {
        try {
            const subtitle = await Storage.getSubtitle(videoId);

            if (subtitle && subtitle.data) {
                currentSubtitle = subtitle;
                LyricsOverlay.setSubtitleData(subtitle.data);
                console.log('[YT-KTV] Subtitle loaded:', subtitle.title);
                console.log('[YT-KTV] Sample data (first 3):', JSON.stringify(subtitle.data.slice(0, 3)));

                notifyPopup({
                    type: 'VIDEO_STATUS',
                    hasSubtitle: true,
                    videoId: videoId,
                    title: subtitle.title
                });
            } else {
                currentSubtitle = null;
                LyricsOverlay.setSubtitleData([]);

                notifyPopup({
                    type: 'VIDEO_STATUS',
                    hasSubtitle: false,
                    videoId: videoId
                });
            }
        } catch (error) {
            console.error('[YT-KTV] Failed to load subtitle:', error);
        }
    }

    /**
     * 處理全螢幕變更
     */
    function handleFullscreenChange(data) {
        const { isFullscreen, fullscreenElement } = data;

        console.log('[YT-KTV] Fullscreen changed:', isFullscreen);

        LyricsOverlay.repositionForFullscreen(isFullscreen, fullscreenElement);
    }

    /**
     * 處理來自 Popup 的訊息
     */
    function handleMessage(message, sender, sendResponse) {
        console.log('[YT-KTV] Message received:', message.type);

        switch (message.type) {
            case 'TOGGLE_SUBTITLES':
                LyricsOverlay.setEnabled(message.enabled);
                Storage.setEnabled(message.enabled);
                sendResponse({ success: true });
                break;

            case 'UPDATE_SETTINGS':
                LyricsOverlay.updateSettings(message.settings);
                Storage.saveSettings({ ...LyricsOverlay.getSettings(), ...message.settings });
                sendResponse({ success: true });
                break;

            case 'LOAD_SUBTITLE':
                handleLoadSubtitle(message.subtitleData);
                sendResponse({ success: true });
                break;

            case 'GET_STATUS':
                sendResponse({
                    success: true,
                    videoId: YouTubeDetector.getCurrentVideoId(),
                    hasSubtitle: !!currentSubtitle,
                    title: currentSubtitle?.title,
                    enabled: LyricsOverlay.getEnabled(),
                    settings: LyricsOverlay.getSettings()
                });
                break;

            case 'RELOAD_SUBTITLE':
                const videoId = YouTubeDetector.getCurrentVideoId();
                if (videoId) {
                    loadSubtitleForVideo(videoId);
                }
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }

        return true; // 保持訊息通道開放
    }

    /**
     * 處理載入字幕
     */
    async function handleLoadSubtitle(parsedSubtitle) {
        if (!parsedSubtitle || !parsedSubtitle.data) {
            return;
        }

        // 儲存字幕
        await Storage.saveSubtitle(
            parsedSubtitle.videoId,
            parsedSubtitle.title,
            parsedSubtitle.url,
            parsedSubtitle.data
        );

        // 如果是當前影片，直接載入
        const currentVideoId = YouTubeDetector.getCurrentVideoId();
        if (currentVideoId === parsedSubtitle.videoId) {
            currentSubtitle = parsedSubtitle;
            console.log('[YT-KTV] Loading subtitle data, sample (first 3):', JSON.stringify(parsedSubtitle.data.slice(0, 3)));
            LyricsOverlay.setSubtitleData(parsedSubtitle.data);

            notifyPopup({
                type: 'VIDEO_STATUS',
                hasSubtitle: true,
                videoId: parsedSubtitle.videoId,
                title: parsedSubtitle.title
            });
        }
    }

    /**
     * 處理儲存變更
     */
    function handleStorageChange(changes, areaName) {
        if (areaName === 'sync') {
            // 設定變更
            if (changes.settings) {
                LyricsOverlay.updateSettings(changes.settings.newValue);
            }
            if (changes.enabled !== undefined) {
                LyricsOverlay.setEnabled(changes.enabled.newValue);
            }
        }
    }

    /**
     * 處理頁面可見性變化
     */
    function handleVisibilityChange() {
        if (document.hidden) {
            // 頁面隱藏時，可以考慮暫停動畫以節省資源
            // LyricsOverlay.stopAnimationLoop();
        } else {
            // 頁面可見時，重新啟動動畫
            // LyricsOverlay.startAnimationLoop(() => YouTubeDetector.getCurrentTime());
        }
    }

    /**
     * 檢查當前影片
     */
    async function checkCurrentVideo() {
        const videoId = YouTubeDetector.getCurrentVideoId();
        if (videoId) {
            await loadSubtitleForVideo(videoId);
        }
    }

    /**
     * 通知 Popup
     */
    function notifyPopup(data) {
        try {
            chrome.runtime.sendMessage(data).catch(() => {
                // Popup 可能未開啟，忽略錯誤
            });
        } catch (error) {
            // 忽略錯誤
        }
    }

    // 當 DOM 準備好時初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

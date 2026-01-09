/**
 * YouTube KTV Lyrics Extension - YouTube Detector Module
 * YouTube 頁面偵測模組
 */

const YouTubeDetector = (function() {
    'use strict';

    // 狀態變數
    let currentVideoId = null;
    let videoElement = null;
    let isFullscreen = false;
    let urlCheckInterval = null;
    let eventListeners = {};

    /**
     * 初始化偵測器
     */
    function init() {
        // 監聽 YouTube SPA 導航事件
        document.addEventListener('yt-navigate-finish', handleNavigate);

        // 監聽全螢幕變化
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // 監聽 popstate（瀏覽器上一頁/下一頁）
        window.addEventListener('popstate', handleNavigate);

        // 攔截 history.pushState
        interceptHistoryAPI();

        // 啟動 URL 輪詢作為備用方案
        startUrlPolling();

        // 執行初始檢查
        handleNavigate();
    }

    /**
     * 攔截 History API
     */
    function interceptHistoryAPI() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(handleNavigate, 100);
        };

        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(handleNavigate, 100);
        };
    }

    /**
     * 啟動 URL 輪詢
     */
    function startUrlPolling() {
        let lastUrl = window.location.href;

        urlCheckInterval = setInterval(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                handleNavigate();
            }
        }, 1000);
    }

    /**
     * 停止 URL 輪詢
     */
    function stopUrlPolling() {
        if (urlCheckInterval) {
            clearInterval(urlCheckInterval);
            urlCheckInterval = null;
        }
    }

    /**
     * 處理導航事件
     */
    function handleNavigate() {
        const newVideoId = extractCurrentVideoId();

        if (newVideoId !== currentVideoId) {
            currentVideoId = newVideoId;
            videoElement = findVideoElement();

            // 觸發影片變更事件
            emit('video-changed', {
                videoId: newVideoId,
                hasVideo: !!newVideoId
            });
        }
    }

    /**
     * 處理全螢幕變化
     */
    function handleFullscreenChange() {
        isFullscreen = !!document.fullscreenElement;

        emit('fullscreen-changed', {
            isFullscreen: isFullscreen,
            fullscreenElement: document.fullscreenElement
        });
    }

    /**
     * 從 URL 提取影片 ID
     * @returns {string|null}
     */
    function extractCurrentVideoId() {
        const url = window.location.href;

        // 檢查是否在 YouTube 影片頁面
        if (!url.includes('youtube.com/watch')) {
            return null;
        }

        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    /**
     * 尋找影片元素
     * @returns {HTMLVideoElement|null}
     */
    function findVideoElement() {
        // YouTube 主要影片元素
        return document.querySelector('video.html5-main-video') ||
               document.querySelector('#movie_player video') ||
               document.querySelector('video');
    }

    /**
     * 取得當前影片 ID
     * @returns {string|null}
     */
    function getCurrentVideoId() {
        return currentVideoId;
    }

    /**
     * 取得當前播放時間
     * @returns {number}
     */
    function getCurrentTime() {
        if (!videoElement) {
            videoElement = findVideoElement();
        }
        return videoElement ? videoElement.currentTime : 0;
    }

    /**
     * 檢查是否正在播放
     * @returns {boolean}
     */
    function isPlaying() {
        if (!videoElement) {
            videoElement = findVideoElement();
        }
        return videoElement ? !videoElement.paused : false;
    }

    /**
     * 檢查是否為全螢幕
     * @returns {boolean}
     */
    function getIsFullscreen() {
        return isFullscreen;
    }

    /**
     * 取得全螢幕容器
     * @returns {HTMLElement|null}
     */
    function getFullscreenContainer() {
        if (document.fullscreenElement) {
            return document.fullscreenElement;
        }

        // 備用：返回 movie_player
        return document.querySelector('#movie_player') ||
               document.querySelector('ytd-player');
    }

    /**
     * 取得 movie_player 元素
     * @returns {HTMLElement|null}
     */
    function getMoviePlayer() {
        return document.querySelector('#movie_player');
    }

    /**
     * 檢查是否正在播放廣告
     * @returns {boolean}
     */
    function isAdPlaying() {
        return document.querySelector('.ad-showing') !== null ||
               document.querySelector('.ytp-ad-player-overlay') !== null ||
               document.querySelector('.ytp-ad-text') !== null;
    }

    /**
     * 檢查頁面是否可見
     * @returns {boolean}
     */
    function isPageVisible() {
        return !document.hidden;
    }

    /**
     * 註冊事件監聽器
     * @param {string} event - 事件名稱
     * @param {function} callback - 回調函式
     */
    function on(event, callback) {
        if (!eventListeners[event]) {
            eventListeners[event] = [];
        }
        eventListeners[event].push(callback);
    }

    /**
     * 移除事件監聽器
     * @param {string} event - 事件名稱
     * @param {function} callback - 回調函式
     */
    function off(event, callback) {
        if (!eventListeners[event]) {
            return;
        }
        eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
    }

    /**
     * 觸發事件
     * @param {string} event - 事件名稱
     * @param {object} data - 事件資料
     */
    function emit(event, data) {
        if (!eventListeners[event]) {
            return;
        }
        eventListeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} handler:`, error);
            }
        });
    }

    /**
     * 等待影片元素出現
     * @param {number} timeout - 超時時間（毫秒）
     * @returns {Promise<HTMLVideoElement>}
     */
    function waitForVideoElement(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const video = findVideoElement();
            if (video) {
                resolve(video);
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                const video = findVideoElement();
                if (video) {
                    clearInterval(checkInterval);
                    videoElement = video;
                    resolve(video);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('Video element not found'));
                }
            }, 100);
        });
    }

    /**
     * 等待 movie_player 元素出現
     * @param {number} timeout - 超時時間（毫秒）
     * @returns {Promise<HTMLElement>}
     */
    function waitForMoviePlayer(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const player = getMoviePlayer();
            if (player) {
                resolve(player);
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                const player = getMoviePlayer();
                if (player) {
                    clearInterval(checkInterval);
                    resolve(player);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('Movie player not found'));
                }
            }, 100);
        });
    }

    /**
     * 銷毀偵測器
     */
    function destroy() {
        document.removeEventListener('yt-navigate-finish', handleNavigate);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        window.removeEventListener('popstate', handleNavigate);
        stopUrlPolling();

        currentVideoId = null;
        videoElement = null;
        isFullscreen = false;
        eventListeners = {};
    }

    // 導出 API
    return {
        init,
        getCurrentVideoId,
        getCurrentTime,
        isPlaying,
        getIsFullscreen,
        getFullscreenContainer,
        getMoviePlayer,
        isAdPlaying,
        isPageVisible,
        findVideoElement,
        waitForVideoElement,
        waitForMoviePlayer,
        on,
        off,
        destroy
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeDetector;
}

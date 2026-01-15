/**
 * YouTube KTV Lyrics - Video Controller Module
 * 負責 YouTube 播放器控制
 */

const VideoController = (function() {
    'use strict';

    let player = null;
    let currentVideoId = null;
    let timerInterval = null;
    let timer = 0;

    /**
     * 載入影片
     */
    function loadVideo() {
        let url = document.getElementById("videoUrl").value;
        let videoId = SubtitleParser.extractVideoId(url);

        if (!videoId) {
            alert("請輸入有效的 YouTube 影片網址！");
            return;
        }

        // 如果已經有載入過影片且有時間戳記錄，警告使用者
        if (currentVideoId && currentVideoId !== videoId && MakerState.timestamps.length > 0) {
            const confirmMessage = "載入新影片將會清除目前的歌詞和時間紀錄！\n\n" +
                                 "請確認：\n" +
                                 "• 如果還沒下載，請先點擊「下載時間紀錄」\n" +
                                 "• 點擊「確定」將清除所有紀錄並載入新影片\n" +
                                 "• 點擊「取消」保留目前紀錄";

            if (!confirm(confirmMessage)) {
                return;
            }

            clearAllRecords();
        }

        currentVideoId = videoId;

        if (player) {
            player.destroy();
        }

        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'controls': 1 },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }

    /**
     * 清除所有紀錄
     */
    function clearAllRecords() {
        MakerState.currentLineIndex = 0;
        MakerState.currentWordIndex = 0;
        MakerState.timestamps = [];
        MakerState.lyrics = [];
        MakerState.pinyinLyrics = [];
        MakerState.pinyinEnabled = false;
        MakerState.totalWordsInSong = 0;

        document.getElementById('lyricsInput').value = '';
        document.getElementById('pinyinInput').value = '';
        document.getElementById('enablePinyin').checked = false;

        if (typeof UIHandlers !== 'undefined') {
            UIHandlers.displayLyrics();
            UIHandlers.updateTimestampsDisplay();
            UIHandlers.updateProgressBar();
        }
    }

    /**
     * 播放器就緒回調
     */
    function onPlayerReady(event) {
        console.log("🎥 影片已載入");
        updateTimer();
    }

    /**
     * 更新計時器
     */
    function updateTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (player && typeof player.getCurrentTime === "function") {
                timer = player.getCurrentTime();
                document.getElementById("timer").textContent = timer.toFixed(2);
            }
        }, 100);
    }

    /**
     * 播放狀態變化回調
     */
    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            updateTimer();
        } else {
            clearInterval(timerInterval);
        }
    }

    /**
     * 取得當前時間
     */
    function getCurrentTime() {
        return player ? player.getCurrentTime() : 0;
    }

    /**
     * 跳轉到指定時間
     */
    function seekTo(time, allowSeekAhead) {
        if (player && typeof player.seekTo === "function") {
            player.seekTo(time, allowSeekAhead !== false);
        }
    }

    /**
     * 取得影片資料
     */
    function getVideoData() {
        return player ? player.getVideoData() : {};
    }

    /**
     * 取得當前影片 ID
     */
    function getVideoId() {
        return currentVideoId;
    }

    /**
     * 取得 player 實例（供外部使用）
     */
    function getPlayer() {
        return player;
    }

    return {
        loadVideo,
        clearAllRecords,
        getCurrentTime,
        seekTo,
        getVideoData,
        getVideoId,
        getPlayer
    };
})();

// YouTube API Ready callback
function onYouTubeIframeAPIReady() {
    console.log("YouTube API 已載入");
}

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoController;
}

/**
 * YouTube KTV Lyrics - Player Entry Point
 * 入口檔案，協調各模組並暴露全域 API
 */

(function() {
    'use strict';

    // 全域狀態（供各模組共享）
    window.PlayerState = {
        player: null,
        subtitleData: [],
        hasPinyin: false,
        currentOddLineIndex: 1,
        currentEvenLineIndex: 2,
        currentFontSize: 30,
        currentOffset: 0,
        roleColors: { ...SubtitleParser.ROLE_COLORS }
    };

    // YouTube API 準備好後的回調
    window.onYouTubeIframeAPIReady = function() {
        if (!PlayerState.player) {
            PlayerState.player = new YT.Player('player', {
                height: '480',
                width: '854',
                playerVars: {
                    'autoplay': 0,
                    'controls': 1,
                    'rel': 0,
                    'modestbranding': 1,
                    'playsinline': 1,
                    'origin': window.location.origin,
                    'enablejsapi': 1
                },
                events: {
                    'onReady': function() {
                        AnimationEngine.startSyncTimer();
                    },
                    'onStateChange': function(event) {
                        if (event.data !== YT.PlayerState.PLAYING) {
                            AnimationEngine.stopSyncTimer();
                        } else {
                            AnimationEngine.startSyncTimer();
                        }
                    },
                    'onError': function(event) {
                        console.error('YouTube Player Error:', event.data);
                        alert('YouTube 影片載入失敗！錯誤代碼: ' + event.data + '\n\n可能原因：\n1. 影片不允許嵌入\n2. 影片已被刪除\n3. 網路連線問題\n4. 使用 file:// 協議（請使用 http://localhost）');
                    }
                }
            });
        }
    };

    // 頁面載入完成
    window.onload = function() {
        // 確保 #player-container 存在
        let playerContainer = document.getElementById("player-container");
        if (!playerContainer) {
            let container = document.createElement("div");
            container.id = "player-container";
            document.body.prepend(container);
        }

        // 確保 #player 存在
        let playerDiv = document.getElementById("player");
        if (!playerDiv) {
            playerDiv = document.createElement("div");
            playerDiv.id = "player";
            document.getElementById("player-container").appendChild(playerDiv);
        }

        // 初始化 YouTube 播放器
        onYouTubeIframeAPIReady();

        // 清空字幕上傳狀態
        document.getElementById("fileName").textContent = "尚未選擇任何檔案";

        // 清空字幕顯示區
        document.getElementById("lyricsDisplay").innerHTML = "";

        // 初始化各模組
        SubtitleLoader.init();
        Customization.init();
        Fullscreen.init();
    };

    // 暴露給 HTML onclick 的函數
    window.loadSubtitleFile = function() {
        SubtitleLoader.loadFile();
    };

    window.toggleCustomFullScreen = function() {
        Fullscreen.toggleFullscreen();
    };

})();

/**
 * YouTube KTV Lyrics - Subtitle Loader Module
 * 負責字幕載入功能
 */

const SubtitleLoader = (function() {
    'use strict';

    /**
     * 初始化字幕載入功能
     */
    function init() {
        setupFileInput();
    }

    /**
     * 設定檔案輸入監聽
     */
    function setupFileInput() {
        let fileInput = document.getElementById("subtitleFile");
        if (fileInput) {
            fileInput.addEventListener("change", function() {
                const fileNameDisplay = document.getElementById("fileName");

                if (this.files.length > 0) {
                    let fileName = this.files[0].name.replace(/\.[^/.]+$/, "");
                    fileNameDisplay.textContent = fileName;
                } else {
                    fileNameDisplay.textContent = "尚未選擇任何檔案";
                }
            });
        }
    }

    /**
     * 載入字幕檔案
     */
    function loadFile() {
        const fileInput = document.getElementById("subtitleFile");
        const file = fileInput.files[0];

        if (!file) {
            alert("❌ 請選擇字幕檔案！");
            return;
        }

        console.log("📂 選擇的檔案：", file.name);

        const reader = new FileReader();
        reader.onload = function(event) {
            const text = event.target.result;
            parseAndLoad(text);
        };

        reader.onerror = function() {
            alert("⚠️ 讀取檔案時發生錯誤！");
        };

        reader.readAsText(file, "UTF-8");
    }

    /**
     * 解析並載入字幕
     */
    function parseAndLoad(text) {
        const result = SubtitleParser.parseSubtitleFile(text);

        if (result.error) {
            alert("❌ " + result.error);
            return;
        }

        // 載入 YouTube 影片
        if (PlayerState.player) {
            PlayerState.player.loadVideoById(result.videoId);
        }

        // 更新全域變數
        PlayerState.subtitleData = result.data;
        PlayerState.hasPinyin = result.hasPinyin;

        // 重置動畫引擎狀態
        AnimationEngine.reset();

        console.log("✅ 處理後的字幕數據：", PlayerState.subtitleData);
        console.log("📝 拼音模式：", PlayerState.hasPinyin);
    }

    /**
     * 從網址提取 YouTube 影片 ID
     */
    function extractVideoId(url) {
        return SubtitleParser.extractVideoId(url);
    }

    return {
        init,
        loadFile,
        parseAndLoad,
        extractVideoId
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubtitleLoader;
}

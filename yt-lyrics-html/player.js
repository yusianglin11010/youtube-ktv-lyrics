let player;
let timestamps = [];
let currentWordIndex = 0;
let subtitleData = []; // 存放已載入的字幕時間軸
let currentOddLineIndex = 1;  // 初始為第一行（奇數）
let currentEvenLineIndex = 2; // 初始為第二行（偶數）
let currentFontSize = 30; // 預設字體大小

// 角色顏色設定（使用共用模組的預設值，可被使用者覆寫）
let roleColors = { ...SubtitleParser.ROLE_COLORS };

window.onload = function () {
    // **確保 #player-container 存在**
    let playerContainer = document.getElementById("player-container");
    if (!playerContainer) {
        let container = document.createElement("div");
        container.id = "player-container";
        document.body.prepend(container);
    }

    // **確保 #player 存在**
    let playerDiv = document.getElementById("player");
    if (!playerDiv) {
        playerDiv = document.createElement("div");
        playerDiv.id = "player";
        document.getElementById("player-container").appendChild(playerDiv);
    }

    // **初始化 YouTube 播放器**
    onYouTubeIframeAPIReady();

    // **清空字幕上傳狀態**
    document.getElementById("fileName").textContent = "尚未選擇任何檔案";

    // **清空字幕顯示區**
    document.getElementById("lyricsDisplay").innerHTML = "";
};

// 載入字型
document.getElementById("fontSelector").addEventListener("change", function () {
    let selectedFont = this.value;
    document.getElementById("lyricsDisplay").style.fontFamily = selectedFont;
});

// 監聽使用者選擇的變色字體顏色
let colorUpdateTimeout = null;

document.getElementById("highlightTextColor").addEventListener("input", debouncedUpdateHighlightColor);
document.getElementById("highlightShadowColor").addEventListener("input", debouncedUpdateHighlightColor);

function debouncedUpdateHighlightColor() {
    // 清除之前的計時器
    if (colorUpdateTimeout) {
        clearTimeout(colorUpdateTimeout);
    }

    // 設定新的計時器，300ms 後才執行
    colorUpdateTimeout = setTimeout(() => {
        updateHighlightColor();
    }, 300);
}

function updateHighlightColor() {
    let highlightTextColor = document.getElementById("highlightTextColor").value;
    let highlightShadowColor = document.getElementById("highlightShadowColor").value;

    // ✅ 變更所有 `.highlight-text` 的顏色
    document.querySelectorAll(".highlight-text").forEach(text => {
        text.style.color = highlightTextColor;
        text.style.textShadow = `2px 2px 5px ${highlightShadowColor}`;
    });
}

// 監聽使用者調整字體大小
document.getElementById("fontSizeSlider").addEventListener("input", updateFontSize);

document.getElementById("fontSizeSlider").addEventListener("input", updateFontSize);

function updateFontSize() {
    let fontSize = document.getElementById("fontSizeSlider").value;
    currentFontSize = fontSize; // ✅ 更新全域變數
    document.getElementById("fontSizeValue").textContent = fontSize + "px";

    // ✅ 直接變更 `lyricsDisplay` 的字體大小
    document.getElementById("lyricsDisplay").style.fontSize = fontSize + "px";
}

// 監聽字幕時間滑桿變化
let currentOffset = 0; // 目前字幕的時間微調值 (預設為 0)

// 監聽滑桿變化
document.getElementById("subtitleOffset").addEventListener("input", function () {
    let newOffset = parseFloat(this.value); // 取得新的微調值
    let delta = newOffset - currentOffset; // 計算變化量

    // 更新顯示數值（讓它更直覺）
    let displayText = "";
    if (newOffset < 0) {
        displayText = `調快 ${Math.abs(newOffset).toFixed(2)}s`; // ✅ 提前
    } else if (newOffset > 0) {
        displayText = `調慢 ${Math.abs(newOffset).toFixed(2)}s`; // ✅ 延遲
    } else {
        displayText = "未微調"; // ✅ 預設狀態
    }

    document.getElementById("subtitleOffsetValue").textContent = displayText;

    // 調整字幕時間
    subtitleData.forEach(entry => {
        entry.startTime += delta;
        entry.endTime += delta;
    });

    // 更新全域變數
    currentOffset = newOffset;

    // 立即更新字幕顯示
    updateLyricsDisplay(player.getCurrentTime());
});

function onYouTubeIframeAPIReady() {
    if (!player) { // 只有當 player 尚未初始化時才建立新播放器
        player = new YT.Player('player', {
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
                'onReady': startSyncTimer, // 影片載入完成後，啟動計時器
                'onError': function(event) {
                    console.error('YouTube Player Error:', event.data);
                    alert('YouTube 影片載入失敗！錯誤代碼: ' + event.data + '\n\n可能原因：\n1. 影片不允許嵌入\n2. 影片已被刪除\n3. 網路連線問題\n4. 使用 file:// 協議（請使用 http://localhost）');
                }
            }
        });
    }
}

// 遮罩相關變數
let isMaskVisible = false;  // 當前遮罩是否顯示
let isMaskPersistent = 0;  // ✅ 記錄遮罩是否應該自動開啟 (0: 關閉, 1: 開啟)
let maskBtnTimeout;
let hideMaskTimeout; // 用於延遲恢復遮罩的計時器

// 遮罩按鈕 & 遮罩層
let maskBtn = document.getElementById("toggleMaskBtn");
let videoMask = document.getElementById("videoMask");
let ytPlayerContainer = document.getElementById("player-container"); // 取得 YouTube 播放器容器

// 📌 監聽全螢幕變化，顯示/隱藏遮罩按鈕 & 恢復遮罩狀態
document.addEventListener("fullscreenchange", function () {
    if (document.fullscreenElement) {
        maskBtn.classList.remove("hidden"); // 顯示遮罩按鈕

        // ✅ 如果之前開啟過遮罩，進入全螢幕時自動開啟
        if (isMaskPersistent === 1) {
            videoMask.classList.remove("hidden");
            maskBtn.textContent = "關閉遮罩";
            isMaskVisible = true;
        }
    } else {
        maskBtn.classList.add("hidden"); // 退出全螢幕時隱藏按鈕
        videoMask.classList.add("hidden"); // 確保遮罩關閉
        isMaskVisible = false;
        maskBtn.textContent = "開啟遮罩";
    }
});

// 📌 按下 "開啟遮罩" 按鈕時，切換遮罩顯示
maskBtn.addEventListener("click", function () {
    isMaskVisible = !isMaskVisible;
    
    if (isMaskVisible) {
        videoMask.classList.remove("hidden");
        maskBtn.textContent = "關閉遮罩";
        isMaskPersistent = 1; // ✅ 記住遮罩開啟狀態
    } else {
        videoMask.classList.add("hidden");
        maskBtn.textContent = "開啟遮罩";
        isMaskPersistent = 0; // ✅ 記住遮罩關閉狀態
    }
});

// 📌 監聽 hover，沒 hover 超過 3 秒就隱藏按鈕
maskBtn.addEventListener("mouseenter", function () {
    maskBtn.classList.remove("hidden-btn");
    clearTimeout(maskBtnTimeout);
});

maskBtn.addEventListener("mouseleave", function () {
    if (document.fullscreenElement) {
        maskBtnTimeout = setTimeout(() => {
            maskBtn.classList.add("hidden-btn");
        }, 3000);
    }
});

// 📌 監聽滑鼠是否移動到播放器進度條，讓遮罩透明
ytPlayerContainer.addEventListener("mousemove", function (event) {
    if (isMaskVisible) {
        let playerRect = ytPlayerContainer.getBoundingClientRect();
        let cursorY = event.clientY;

        // 如果滑鼠進入播放器下方 60px（調整播放範圍），則讓遮罩透明
        if (cursorY > playerRect.bottom - 60) {
            videoMask.style.opacity = "0";
            videoMask.style.transition = "opacity 0.3s ease-in-out"; // ✅ 添加淡化動畫
            clearTimeout(hideMaskTimeout); // 清除之前的計時
        } else {
            // 如果滑鼠離開進度條範圍，1.5 秒後恢復遮罩
            hideMaskTimeout = setTimeout(() => {
                if (isMaskVisible) {
                    videoMask.style.opacity = "1"; // 恢復遮罩
                    videoMask.style.transition = "opacity 0.5s ease-in-out"; // ✅ 添加淡化動畫
                }
            }, 1500);
        }
    }
});

// 🎵 計時器 - 每 1ms 更新一次時間
function startSyncTimer() {
    setInterval(() => {
        if (player && player.getCurrentTime) {
            let currentTime = parseFloat(player.getCurrentTime().toFixed(2)); // 取得影片當前時間
            updateLyricsDisplay(currentTime);
        }
    }, 1); // 1ms 更新一次，確保流暢
}

// 從網址提取 YouTube 影片 ID（使用共用模組）
function extractVideoId(url) {
    return SubtitleParser.extractVideoId(url);
}

document.getElementById("subtitleFile").addEventListener("change", function() {
    const fileInput = this;
    const fileNameDisplay = document.getElementById("fileName");

    if (fileInput.files.length > 0) {
        // 取得檔名（不含副檔名）
        let fileName = fileInput.files[0].name.replace(/\.[^/.]+$/, "");
        fileNameDisplay.textContent = fileName; // ✅ 只顯示檔名，不含副檔名
    } else {
        fileNameDisplay.textContent = "尚未選擇任何檔案";
    }
});

// 🎵 讀取時間紀錄並自動載入影片
function loadSubtitleFile() {
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
        parseSubtitleFormat(text);
    };

    reader.onerror = function() {
        alert("⚠️ 讀取檔案時發生錯誤！");
    };

    reader.readAsText(file, "UTF-8");
}

// 全域變數：是否有拼音
let hasPinyin = false;

// 解析字幕格式（使用共用模組）
function parseSubtitleFormat(text) {
    const result = SubtitleParser.parseSubtitleFile(text);

    if (result.error) {
        alert("❌ " + result.error);
        return;
    }

    // 直接載入 YouTube 影片
    if (player) {
        player.loadVideoById(result.videoId);
    }

    // 更新全域變數
    subtitleData = result.data;
    hasPinyin = result.hasPinyin;

    console.log("✅ 處理後的字幕數據：", subtitleData);
    console.log("📝 拼音模式：", hasPinyin);
}

// 📺 影片狀態變更
function onPlayerStateChange(event) {
    if (event.data !== YT.PlayerState.PLAYING) {
        clearInterval(syncInterval);
    }
}

// 監聽全螢幕按鈕
let fullscreenBtn = document.getElementById("customFullscreenBtn");
let hideFullscreenTimeout; // 計時器

document.getElementById("customFullscreenBtn").addEventListener("click", toggleCustomFullScreen);

function toggleCustomFullScreen() {
    if (!document.fullscreenElement) {
        // **進入真正的全螢幕模式**
        document.documentElement.requestFullscreen().then(() => {
            document.body.classList.add("fullscreen");
            fullscreenBtn.textContent = "退出全螢幕";

            // 設定 3 秒後讓按鈕透明
            hideFullscreenTimeout = setTimeout(() => {
                fullscreenBtn.classList.add("hide-fullscreen-btn");
            }, 3000);
            maskBtnTimeout = setTimeout(() => {
                maskBtn.classList.add("hidden-btn");
            }, 3000);
        }).catch(err => {
            console.error("🔴 無法進入全螢幕模式:", err);
        });
    } else {
        // **退出全螢幕模式**
        document.exitFullscreen().then(() => {
            document.body.classList.remove("fullscreen");
            fullscreenBtn.textContent = "全螢幕播放";
            fullscreenBtn.classList.remove("hide-fullscreen-btn"); // 立即顯示按鈕
            clearTimeout(hideFullscreenTimeout);
        }).catch(err => {
            console.error("🔴 無法退出全螢幕模式:", err);
        });
    }
}

// 滑鼠移動到按鈕時，取消隱藏
fullscreenBtn.addEventListener("mouseenter", function () {
    fullscreenBtn.classList.remove("hide-fullscreen-btn"); // 重新顯示按鈕
    clearTimeout(hideFullscreenTimeout);
});

// 滑鼠離開後，重新啟動 3 秒後隱藏計時
fullscreenBtn.addEventListener("mouseleave", function () {
    if (document.fullscreenElement) {
        hideFullscreenTimeout = setTimeout(() => {
            fullscreenBtn.classList.add("hide-fullscreen-btn");
        }, 3000);
    }
});

// 監聽 Esc 鍵來退出全螢幕模式
document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement) {
        document.body.classList.remove("fullscreen");
        fullscreenBtn.textContent = "全螢幕播放";
        fullscreenBtn.classList.remove("hide-fullscreen-btn"); // 立即顯示按鈕
        clearTimeout(hideFullscreenTimeout);
    }
});

// 🎤 更新 KTV 字幕動畫
let lastUpdateTime = 0; // 記錄上一次的時間戳

function updateLyricsDisplay(currentTime) {
    let displayArea = document.getElementById("lyricsDisplay");
    displayArea.innerHTML = ""; // 清空字幕區域

    // 獲取字幕的最大行數
    const maxLine = Math.max(...subtitleData.map(entry => entry.line));

    // 找到當前時間對應的行數
    let activeLines = new Set();
    let closestEntry = null;
    let minFutureEntry = null;

    subtitleData.forEach(entry => {
        if (currentTime >= entry.startTime && currentTime <= entry.endTime) {
            activeLines.add(entry.line);
        }
        if (entry.startTime >= currentTime && (minFutureEntry === null || entry.startTime < minFutureEntry.startTime)) {
            minFutureEntry = entry;
        }
    });

    // 若當前時間未匹配任何行，則使用最接近的未來字幕行
    if (activeLines.size === 0 && minFutureEntry) {
        activeLines.add(minFutureEntry.line);
    }

    // 找到當前時間應該顯示的字幕行
    let closestLine = Math.min(...activeLines);

    // 判斷是否發生快進快退
    if (Math.abs(currentTime - lastUpdateTime) > 0.5) {
        let nearestEntry = subtitleData.find(entry => entry.startTime >= currentTime);
        if (nearestEntry) {
            if (nearestEntry.line % 2 === 1) {
                currentOddLineIndex = nearestEntry.line;
                currentEvenLineIndex = currentOddLineIndex + 1;
            } else {
                currentEvenLineIndex = nearestEntry.line;
                currentOddLineIndex = currentEvenLineIndex + 1;
            }
        }
    }
    lastUpdateTime = currentTime; // 更新時間戳

    // 取得當前行數的字幕
    let upperLyrics = subtitleData.filter(entry => entry.line === currentOddLineIndex);
    let lowerLyrics = subtitleData.filter(entry => entry.line === currentEvenLineIndex);

    let upperLineDiv = document.createElement("div");
    upperLineDiv.classList.add("lyrics-line");
    upperLineDiv.style.fontSize = currentFontSize + "px";

    let lowerLineDiv = document.createElement("div");
    lowerLineDiv.classList.add("lyrics-line");
    lowerLineDiv.style.fontSize = currentFontSize + "px";

    function createWordSpan(entry) {
        let wordSpan = document.createElement("span");
        wordSpan.classList.add("word");
        wordSpan.style.fontSize = currentFontSize + "px";

        // 建立容器（垂直排列拼音和主字幕）
        let wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        // 拼音層（如果有拼音）
        let pinyinHighlight = null;
        if (entry.pinyin) {
            let pinyinSpan = document.createElement("span");
            pinyinSpan.classList.add("pinyin-text");
            pinyinSpan.style.fontSize = (currentFontSize * 0.5) + "px";

            let pinyinBase = document.createElement("span");
            pinyinBase.classList.add("pinyin-base-text");
            pinyinBase.textContent = entry.pinyin;

            pinyinHighlight = document.createElement("span");
            pinyinHighlight.classList.add("pinyin-highlight-text");
            pinyinHighlight.textContent = entry.pinyin;

            pinyinSpan.appendChild(pinyinBase);
            pinyinSpan.appendChild(pinyinHighlight);
            wordContainer.appendChild(pinyinSpan);
        }

        // 主字幕層
        let mainTextWrapper = document.createElement("span");
        mainTextWrapper.classList.add("main-text-wrapper");

        let baseText = document.createElement("span");
        baseText.classList.add("base-text");
        baseText.innerHTML = entry.word.replace(/␣␣/g, "&nbsp;&nbsp;").replace(/␣/g, "&nbsp;");
        baseText.style.fontSize = currentFontSize + "px";

        let highlightText = document.createElement("span");
        highlightText.classList.add("highlight-text");
        highlightText.innerHTML = entry.word.replace(/␣␣/g, "&nbsp;&nbsp;").replace(/␣/g, "&nbsp;");
        highlightText.style.fontSize = currentFontSize + "px";

        mainTextWrapper.appendChild(baseText);
        mainTextWrapper.appendChild(highlightText);
        wordContainer.appendChild(mainTextWrapper);

        wordSpan.appendChild(wordContainer);

        // 啟動動畫（主字幕和拼音同步）
        animateWordHighlight(entry, highlightText, currentTime);
        if (pinyinHighlight) {
            animateWordHighlight(entry, pinyinHighlight, currentTime);
        }

        return wordSpan;
    }

    function animateWordHighlight(entry, highlightText, currentTime) {
        let totalDuration = entry.endTime - entry.startTime;
        let elapsedTime = Math.max(0, currentTime - entry.startTime);
        let progress = Math.min(1, elapsedTime / totalDuration);

        // 根據角色選擇顏色
        let highlightTextColor;
        if (entry.role && roleColors[entry.role]) {
            highlightTextColor = roleColors[entry.role];
        } else {
            highlightTextColor = document.getElementById("highlightTextColor").value;
        }
        let highlightShadowColor = document.getElementById("highlightShadowColor").value;

        highlightText.style.clipPath = `inset(0 ${100 - progress * 100}% 0 0)`;
        highlightText.style.color = highlightTextColor;
        highlightText.style.textShadow = `2px 2px 5px ${highlightShadowColor}`;

        if (progress < 1) {
            setTimeout(() => {
                requestAnimationFrame(() => animateWordHighlight(entry, highlightText, player.getCurrentTime()));
            }, 20); // 降低頻率，每 20ms 更新一次
        }
    }

    upperLyrics.forEach(entry => {
        upperLineDiv.appendChild(createWordSpan(entry));
    });

    lowerLyrics.forEach(entry => {
        lowerLineDiv.appendChild(createWordSpan(entry));
    });

    displayArea.appendChild(upperLineDiv);
    displayArea.appendChild(lowerLineDiv);

    // **字幕換行條件**
    if (
        upperLyrics.length > 0 &&
        currentTime > upperLyrics[upperLyrics.length - 1].endTime + 0.6 &&
        maxLine >= currentOddLineIndex + 2
    ) {
        currentOddLineIndex += 2;
    }

    if (
        lowerLyrics.length > 0 &&
        currentTime > lowerLyrics[lowerLyrics.length - 1].endTime + 0.6 &&
        maxLine >= currentEvenLineIndex + 2
    ) {
        currentEvenLineIndex += 2;
    }
}

// 🎨 預設顏色按鈕點擊事件
document.querySelectorAll('.color-preset-btn:not(.color-custom-btn)').forEach(btn => {
    btn.addEventListener('click', function() {
        const selectedColor = this.getAttribute('data-color');

        // 更新隱藏的 color picker 值
        document.getElementById('highlightTextColor').value = selectedColor;

        // 移除所有按鈕的選中狀態
        document.querySelectorAll('.color-preset-btn').forEach(b => b.classList.remove('selected'));

        // 標記當前按鈕為選中
        this.classList.add('selected');

        // 立即套用顏色（不使用 debounce，因為是單次點擊）
        updateHighlightColor();
    });
});

// 🎨 自訂顏色按鈕點擊事件
document.getElementById('customColorBtn').addEventListener('click', function() {
    // 觸發隱藏的 color picker
    const colorPicker = document.getElementById('highlightTextColor');
    colorPicker.click();

    // 監聽 color picker 的變更
    colorPicker.addEventListener('change', function() {
        // 移除所有預設按鈕的選中狀態
        document.querySelectorAll('.color-preset-btn').forEach(b => b.classList.remove('selected'));

        // 標記「自訂」按鈕為選中
        document.getElementById('customColorBtn').classList.add('selected');

        // 立即套用顏色
        updateHighlightColor();
    }, { once: true }); // 只執行一次
});

// 🎨 頁面載入時，標記預設選中的顏色按鈕
window.addEventListener('load', function() {
    const currentColor = document.getElementById('highlightTextColor').value.toUpperCase();
    const matchingBtn = document.querySelector(`.color-preset-btn[data-color="${currentColor}"]`);

    if (matchingBtn) {
        matchingBtn.classList.add('selected');
    } else {
        // 如果不是預設顏色，標記「自訂」為選中
        document.getElementById('customColorBtn').classList.add('selected');
    }
});

// 🎭 角色顏色變更事件
document.getElementById('role1Color').addEventListener('input', function() {
    roleColors['1'] = this.value;
});

document.getElementById('role2Color').addEventListener('input', function() {
    roleColors['2'] = this.value;
});

document.getElementById('role3Color').addEventListener('input', function() {
    roleColors['3'] = this.value;
});



// 載入影片
let player;
let currentVideoId = null; // 追蹤當前載入的影片ID

function loadVideo() {
    let url = document.getElementById("videoUrl").value;
    let videoId = extractVideoId(url);

    if (!videoId) {
        alert("請輸入有效的 YouTube 影片網址！");
        return;
    }

    // 如果已經有載入過影片且有時間戳記錄，警告使用者
    if (currentVideoId && currentVideoId !== videoId && timestamps.length > 0) {
        const confirmMessage = "載入新影片將會清除目前的歌詞和時間紀錄！\n\n" +
                             "請確認：\n" +
                             "• 如果還沒下載，請先點擊「下載時間紀錄」\n" +
                             "• 點擊「確定」將清除所有紀錄並載入新影片\n" +
                             "• 點擊「取消」保留目前紀錄";

        if (!confirm(confirmMessage)) {
            return; // 使用者取消，不載入新影片
        }

        // 使用者確認，清除所有紀錄
        clearAllRecords();
    }

    // 更新當前影片ID
    currentVideoId = videoId;

    // 若player已存在，先銷毀再重新載入
    if (player) {
        player.destroy();
    }

    player = new YT.Player('player', {
        height: '480',
        width: '854',
        videoId: videoId,
        playerVars: { 'autoplay': 1, 'controls': 1 },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// 清除所有紀錄的輔助函數
function clearAllRecords() {
    currentLineIndex = 0;
    currentWordIndex = 0;
    timestamps = [];
    lyrics = [];
    pinyinLyrics = [];
    pinyinEnabled = false;
    totalWordsInSong = 0;

    // 清空歌詞輸入框
    document.getElementById('lyricsInput').value = '';
    document.getElementById('pinyinInput').value = '';
    document.getElementById('enablePinyin').checked = false;

    // 更新 UI
    displayLyrics();
    updateTimestampsDisplay();
    updateProgressBar();
}

// 擷取影片ID（使用共用模組）
function extractVideoId(url) {
    return SubtitleParser.extractVideoId(url);
}

// 通知YouTubeAPI載入
function onYouTubeIframeAPIReady() {
    console.log("YouTube API 已載入");
}


// 載入Timer
let timer = 0;
function onPlayerReady(event) {
    console.log("🎥 影片已載入");
    updateTimer();
}
function updateTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (player && typeof player.getCurrentTime === "function") {
            timer = player.getCurrentTime();
            document.getElementById("timer").textContent = timer.toFixed(2);
        }
    }, 100);
}

// 影片播放時確保Timer同步
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        updateTimer();
    } else {
        clearInterval(timerInterval);
    }
}
let timerInterval;


// 歌詞變數定義
let lyrics = [];  // 儲存逐字拆分的歌詞
let pinyinLyrics = [];  // 儲存逐字拆分的拼音（Phase 2 的主要同步目標）
let pinyinEnabled = false;  // 是否啟用拼音
let currentWordIndex = 0;  // 當前變色的字索引（Phase 2 時追蹤拼音音節）
let timestamps = [];  // 記錄按鍵時間（由 mapping 生成）
let currentRole = '';  // 當前選擇的角色 ('', '1', '2', '3')

// 新的 pinyin-first workflow 變數
let pinyinTimestamps = [];  // 儲存拼音音節的時間戳記
let pinyinToLyricMappings = [];  // 儲存拼音到主歌詞的 mapping 關係
let workflowPhase = 'INPUT';  // 'INPUT' | 'SYNC_PINYIN' | 'MAPPING' | 'COMPLETE'
let mappingSelection = [];  // 拖曳選取的臨時陣列
let mappingDragStart = null;  // 拖曳起始索引
let mappingDragEnd = null;  // 拖曳結束索引

// Group Mapping 變數（前置處理功能）
let groupMappingState = {
    currentLine: 0,
    pinyinData: [],
    lyricsData: [],
    mappings: [],
    selection: [],
    pinyinFocus: 0,
    lyricFocus: 0
};
let groupMappingKeyboardHandler = null;

// 讀取歌詞
let totalWordsInSong = 0;
function loadLyrics() {
    let inputText = document.getElementById("lyricsInput").value.trim();
    let pinyinInput = document.getElementById("pinyinInput").value.trim();
    pinyinEnabled = document.getElementById("enablePinyin").checked;

    if (!inputText) {
        alert("❌ 請輸入主歌詞！");
        return;
    }

    // 解析主歌詞（儲存供 mapping 用）
    lyrics = inputText.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    // 新模式：拼音優先
    if (!pinyinEnabled || !pinyinInput) {
        alert("❌ 新模式需要啟用拼音並輸入拼音內容！\n請勾選「啟用拼音」並在拼音欄位輸入音節（空格分隔）。");
        return;
    }

    // 解析拼音（現在是主要同步目標）
    pinyinLyrics = pinyinInput.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    // 驗證行數對齊
    if (lyrics.length !== pinyinLyrics.length) {
        alert(`⚠️ 主歌詞有 ${lyrics.length} 行，拼音有 ${pinyinLyrics.length} 行，請檢查對齊！`);
        return;
    }

    // 初始化新工作流程狀態
    workflowPhase = 'SYNC_PINYIN';
    pinyinTimestamps = [];
    pinyinToLyricMappings = [];
    timestamps = [];
    currentWordIndex = 0;
    currentLineIndex = 0;
    totalWordsInSong = pinyinLyrics.reduce((sum, line) => sum + line.length, 0);

    displayPinyinSyncInterface();
    updateProgressBar();
}

// 檢查歌詞與拼音對齊
function checkAlignment(mainLyrics, pinyinLines) {
    if (mainLyrics.length !== pinyinLines.length) {
        return false;
    }

    for (let i = 0; i < mainLyrics.length; i++) {
        if (mainLyrics[i].length !== pinyinLines[i].length) {
            return false;
        }
    }
    return true;
}

// 驗證對齊按鈕
function validateAlignment() {
    let inputText = document.getElementById("lyricsInput").value.trim();
    let pinyinInput = document.getElementById("pinyinInput").value.trim();
    let validateBtn = document.querySelector(".validate-btn");

    if (!inputText) {
        alert("請先輸入主歌詞！");
        return;
    }

    if (!pinyinInput) {
        alert("請先輸入拼音！");
        return;
    }

    // 解析兩者
    let mainLines = inputText.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    let pinyinLines = pinyinInput.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    // 檢查行數
    if (mainLines.length !== pinyinLines.length) {
        validateBtn.classList.remove("success");
        validateBtn.classList.add("error");
        validateBtn.textContent = "行數不符";
        setTimeout(() => {
            validateBtn.classList.remove("error");
            validateBtn.textContent = "驗證對齊";
        }, 2000);
        alert(`❌ 行數不對齊！\n主歌詞：${mainLines.length} 行\n拼音：${pinyinLines.length} 行`);
        return;
    }

    // 檢查每行字數
    let mismatchLines = [];
    for (let i = 0; i < mainLines.length; i++) {
        if (mainLines[i].length !== pinyinLines[i].length) {
            mismatchLines.push({
                line: i + 1,
                mainCount: mainLines[i].length,
                pinyinCount: pinyinLines[i].length
            });
        }
    }

    if (mismatchLines.length > 0) {
        validateBtn.classList.remove("success");
        validateBtn.classList.add("error");
        validateBtn.textContent = "字數不符";
        setTimeout(() => {
            validateBtn.classList.remove("error");
            validateBtn.textContent = "驗證對齊";
        }, 2000);

        let details = mismatchLines.slice(0, 5).map(m =>
            `第 ${m.line} 行：主歌詞 ${m.mainCount} 字，拼音 ${m.pinyinCount} 字`
        ).join("\n");

        if (mismatchLines.length > 5) {
            details += `\n...還有 ${mismatchLines.length - 5} 行不對齊`;
        }

        alert(`❌ 部分行的字數不對齊！\n\n${details}`);
        return;
    }

    // 全部對齊
    validateBtn.classList.remove("error");
    validateBtn.classList.add("success");
    validateBtn.textContent = "對齊成功";
    setTimeout(() => {
        validateBtn.classList.remove("success");
        validateBtn.textContent = "驗證對齊";
    }, 2000);
}

// 解析單行歌詞，根據 `/` 來標示獨立字元組
function parseLyricsLine(line) {
    // **如果該行已經有 `/`，直接拆分**
    if (line.includes("/")) {
        return splitBySlashes(line);
    }

    // **標記 `/`**
    let markedLine = addSlashesToWords(line);

    // **根據 `/` 拆分成字元組**
    return splitBySlashes(markedLine);
}

// **逐字標記 `/`**
function addSlashesToWords(line) {
    let result = "";
    let len = line.length;
    let thirdSymbolCount = 0; // 記錄 `"` 出現次數
    let inBracket = false; // 是否進入 `[` `]` 標註模式

    for (let i = 0; i < len; i++) {
        let char = line[i];
        let nextChar = line[i + 1] || ""; // 下一個字元，若無則為空字串

        // **標註模式開始**
        if (char === "[") {
            inBracket = true; // 開啟標註模式
            continue; // 跳過 `[`，不加入 `result`
        }

        // **標註模式結束**
        if (char === "]") {
            inBracket = false; // 關閉標註模式
            result += "/"; // `]` 轉為 `/`
            continue;
        }

        // **如果在標註模式內，直接加入字元，不進行自動分割**
        if (inBracket) {
            result += char;
            continue;
        }

        result += char; // 先加當前字元

        // **定義字元類型**
        let isLatin = /[\p{Script=Latin}’\u0300-\u036F]/u.test(char);
        let isCJK = /[\p{Script=Han}\p{Script=Hangul}]/u.test(char);
        let isNumber = /[1234567890１２３４５６７８９０]/u.test(char);
        let isHiraganaKatakana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char);
        let isKanaLongOrSmall = /[ぁぃぅぇぉゅょゃっーァィゥェォュョャッ]/u.test(char);
        let isPunctuationOrSpace = /[ \-,　.;:?!，。；：？！、」)）”]/u.test(char);
        let isSecondClassPunctuation = /[「(（¿¡]/u.test(char);
        let isThirdClassPunctuation = /["]/u.test(char); // `"`

        let isNextLatin = /[\p{Script=Latin}’\u0300-\u036F]/u.test(nextChar);
        let isNextCJK = /[\p{Script=Han}\p{Script=Hangul}]/u.test(nextChar);
        let isNextNumber = /[1234567890１２３４５６７８９０]/u.test(nextChar);
        let isNextHiraganaKatakana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(nextChar);
        let isNextKanaLongOrSmall = /[ぁぃぅぇぉゅょゃっーァィゥェォュョャッ]/u.test(nextChar);
        let isNextPunctuationOrSpace = /[ \-,　.;:?!，。；：？！、」)）”]/u.test(nextChar);
        let isNextSecondClassPunctuation = /[「(（¿¡]/u.test(nextChar);
        let isNextThirdClassPunctuation = /["]/u.test(nextChar);

        // **規則 0: 當前字元為最後一個字元，無條件加 `/`**
        if (i === len - 1) {
            result += "/";
            continue;
        }

        // **規則 1: 當前字元為拉丁字母**
        if (isLatin) {
            if (!(isNextLatin || isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }

        // **規則 2: 當前字元為漢字或韓文字**
        if (isCJK) {
            if (!(isNextKanaLongOrSmall || isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }

        // **規則 3: 當前字元為空格或第一類標點符號**
        if (isPunctuationOrSpace) {
            if (!(isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }

        // **規則 4: 當前字元為第二類標點符號**
        if (isSecondClassPunctuation) {
            continue; // 直接跳過，不加 `/`
        }

        // **規則 5: 當前字元為第三類標點符號 (`"`)**
        if (isThirdClassPunctuation) {
            thirdSymbolCount++;
            if (thirdSymbolCount % 2 === 0) {
                result += "/"; // 偶數次 `" "`
            }
            continue;
        }

        // **規則 6: 當前字元為日文字**
        if (isHiraganaKatakana) {
            if (!(isNextKanaLongOrSmall || isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }

        // **規則 7: 當前字元為日文字的半音或長音**
        if (isKanaLongOrSmall) {
            if (!(isNextKanaLongOrSmall)) {
                result += "/";
            }
            continue;
        }

        // **規則 8: 當前字元為數字**
        if (isNumber) {
            if (!(isNextNumber || isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }
    }

    return result;
}

// **根據 `/` 來拆分字元組**
function splitBySlashes(line) {
    return line.split("/").filter(word => word.trim().length > 0);
}

// 讓使用者點擊歌詞輸入框時，能夠切換當前顯示的行
document.getElementById("lyricsInput").addEventListener("click", function (event) {
    let textarea = event.target;
    let clickedLineIndex = getClickedLineIndex(textarea, event);

    if (clickedLineIndex !== null && clickedLineIndex < lyrics.length) {
        currentLineIndex = clickedLineIndex; // 更新當前行索引
        displayLyrics(); // 重新顯示該行的 KTV 歌詞
        currentWordIndex = 0;
    }
});

// **取得使用者點擊的行數（對應 `lyrics` 的非空行）**
function getClickedLineIndex(textarea, event) {
    let text = textarea.value.substr(0, textarea.selectionStart); // 取得游標之前的文字
    let inputLines = textarea.value.split("\n"); // 取得所有行（包含空行）
    
    let nonEmptyLines = inputLines
        .map((line, index) => ({ index, text: line.trim() }))
        .filter(line => line.text.length > 0); // 過濾掉純空行

    let lineIndex = text.split("\n").length - 1; // 取得使用者點擊的行數

    // **確保行數對應到 `lyrics` 的非空行**
    let mappedIndex = nonEmptyLines.findIndex(line => line.index === lineIndex);

    return mappedIndex !== -1 ? mappedIndex : null;
}

// **顯示當前行的 KTV 歌詞（舊模式，保留作為備用）**
function displayLyrics() {
    let displayArea = document.getElementById("lyricsDisplay");

    if (lyrics.length === 0 || currentLineIndex >= lyrics.length) {
        displayArea.innerHTML = ""; // 如果沒有歌詞或索引超出範圍，清空顯示
        return;
    }

    displayArea.innerHTML = lyrics[currentLineIndex]
        .filter(word => word.trim() !== "") // 過濾掉純空格
        .map((word, index) => {
            // 如果啟用拼音且有對應的拼音
            let pinyinText = "";
            if (pinyinEnabled && pinyinLyrics[currentLineIndex] &&
                pinyinLyrics[currentLineIndex][index]) {
                pinyinText = `<span class="pinyin-preview">${pinyinLyrics[currentLineIndex][index]}</span>`;
            }
            return `<span id="word-${index}" class="word">${pinyinText}<span class="main-word">${word}</span></span>`;
        }).join("");

    updateLyricsStatus()
}

// **Phase 2: 顯示拼音同步介面（拼音為主，主歌詞為提示）**
function displayPinyinSyncInterface() {
    let container = document.getElementById("lyricsDisplay");
    container.innerHTML = "";

    if (pinyinLyrics.length === 0 || currentLineIndex >= pinyinLyrics.length) {
        return;
    }

    // 顯示主歌詞作為小字提示
    let mainLyricPreview = document.createElement("div");
    mainLyricPreview.className = "main-lyric-preview";
    mainLyricPreview.textContent = `主歌詞：${lyrics[currentLineIndex].join("")}`;
    container.appendChild(mainLyricPreview);

    // 顯示拼音音節（大字，可點擊）
    let pinyinLine = document.createElement("div");
    pinyinLine.className = "pinyin-line";
    pinyinLyrics[currentLineIndex].forEach((syllable, idx) => {
        let span = document.createElement("span");
        span.id = `pinyin-${idx}`;
        span.className = "pinyin-syllable";
        span.textContent = syllable;

        // 檢查是否已記錄
        let recorded = pinyinTimestamps.find(p =>
            p.line === currentLineIndex + 1 && p.syllableIndex === idx + 1
        );
        if (recorded) {
            span.classList.add("highlight");
        }

        pinyinLine.appendChild(span);
    });
    container.appendChild(pinyinLine);

    updateLyricsStatus();
}

// 轉換秒數格式
function formatTime(seconds) {
    let min = Math.floor(seconds / 60).toString().padStart(2, '0');
    let sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    let ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
    return `${min}:${sec}:${ms}`;
}

// 角色選擇功能
function setRole(role) {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === role);
    });
}

// 角色選擇按鈕事件
document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        setRole(this.dataset.role);
    });
});

// 監聽鍵盤事件
document.addEventListener("keydown", (event) => {
    // 取得當前焦點元素
    let activeElement = document.activeElement;

    // 如果焦點在輸入框 (input 或 textarea)，則讓按鍵保持預設行為
    if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
        return; // 不攔截按鍵，讓使用者可以自由輸入
    }

    // 角色選擇快捷鍵 (數字鍵 0, 1, 2, 3)
    if (event.code === "Digit0" || event.code === "Numpad0") {
        event.preventDefault();
        setRole('');
    } else if (event.code === "Digit1" || event.code === "Numpad1") {
        event.preventDefault();
        setRole('1');
    } else if (event.code === "Digit2" || event.code === "Numpad2") {
        event.preventDefault();
        setRole('2');
    } else if (event.code === "Digit3" || event.code === "Numpad3") {
        event.preventDefault();
        setRole('3');
    }
    // KTV 字幕的快捷鍵
    else if (event.code === "Space" || event.code === "ArrowRight") {
        event.preventDefault();
        nextChar();
    } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        restartCurrentLine();
    } else if (event.code === "ArrowUp") {
        event.preventDefault();
        prevLine();
    } else if (event.code === "ArrowDown") {
        event.preventDefault();
        nextLine();
    }
});

function nextLine() {
    while (currentLineIndex < lyrics.length - 1) {
        currentLineIndex++;
        currentWordIndex = 0;

        // 檢查當前行是否為空，若是則跳過
        if (lyrics[currentLineIndex].length > 0) {
            displayLyrics();
            return;
        }
    }
}

// 模擬按鈕的 hover 效果
function addButtonEffect(buttonId) {
    let button = document.getElementById(buttonId);
    if (button) {
        button.classList.add("active"); // 添加 active 效果
        setTimeout(() => {
            button.classList.remove("active"); // 0.1 秒後移除
        }, 100);
    }
}

// 控制按鈕
function restartCurrentLine() {
    addButtonEffect("prevCharBtn"); // 仍使用原本的按鈕效果

    // **先找到該行第一個字的時間戳記**
    let firstTimestamp = findFirstTimestampOfCurrentLine();

    // **刪除當前行的所有時間戳記**
    timestamps = timestamps.filter(t => t.line !== currentLineIndex + 1);

    // 移除當前行所有字的 highlight 樣式
    document.querySelectorAll(`#lyricsDisplay .word`).forEach(word => {
        word.classList.remove("highlight");
    });

    // 重置索引，回到本行第一個字
    currentWordIndex = 0;

    // **更新 UI**
    updateTimestampsDisplay();
    updateLyricsStatus();

    // **設定 YouTube 播放器時間為 該行第一個字的時間戳記 -1.5 秒**
    if (firstTimestamp !== null && player && typeof player.seekTo === "function") {
        let targetTime = Math.max(0, firstTimestamp - 1.5);
        player.seekTo(targetTime, true);
    }
}

// **找到該行第一個字的時間戳記**
function findFirstTimestampOfCurrentLine() {
    for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i].line === currentLineIndex + 1) {
            return parseTimeToSeconds(timestamps[i].start); // **返回該行第一個字的時間**
        }
    }
    return null;
}

// **解析時間格式（mm:ss:ms）轉換為秒數（使用共用模組）**
function parseTimeToSeconds(timeString) {
    try {
        return SubtitleParser.timeToSeconds(timeString);
    } catch (e) {
        return null;
    }
}

// **Phase 2: 記錄拼音音節時間戳記**
function nextPinyinSyllable() {
    if (currentWordIndex < pinyinLyrics[currentLineIndex].length) {
        addButtonEffect("nextCharBtn");
        let currentTime = player.getCurrentTime();
        let startTime = formatTime(currentTime);
        let endTime = formatTime(currentTime + 1);

        // 更新上一個音節的結束時間
        if (currentWordIndex > 0) {
            let lastEntry = pinyinTimestamps[pinyinTimestamps.length - 1];
            if (lastEntry) {
                lastEntry.end = startTime;
            }
        }

        // 記錄當前拼音音節
        let newEntry = {
            line: currentLineIndex + 1,
            syllableIndex: currentWordIndex + 1,
            start: startTime,
            end: endTime,
            syllable: pinyinLyrics[currentLineIndex][currentWordIndex],
            role: currentRole,
            mappedToWord: null
        };

        pinyinTimestamps.push(newEntry);

        // 高亮當前音節
        document.getElementById(`pinyin-${currentWordIndex}`).classList.add("highlight");
        currentWordIndex++;
        updatePinyinTimestampsDisplay();

        // 檢查是否完成所有行
        if (allPinyinSynced()) {
            promptEnterMappingPhase();
        } else if (currentWordIndex >= pinyinLyrics[currentLineIndex].length) {
            // 自動換行
            setTimeout(() => {
                nextLine();
            }, 200);
        }
    }
    updateProgressBar();
    updatePinyinDownloadStatus();
}

// 更新拼音模式下的下載按鈕狀態
function updatePinyinDownloadStatus() {
    let downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn && pinyinTimestamps.length > 0) {
        downloadBtn.disabled = false;
        downloadBtn.classList.add("active");
    }
}

// 檢查所有拼音是否已同步完成
function allPinyinSynced() {
    let totalPinyinSyllables = pinyinLyrics.reduce((sum, line) => sum + line.length, 0);
    return pinyinTimestamps.length >= totalPinyinSyllables;
}

// 提示進入 Mapping 階段
function promptEnterMappingPhase() {
    let choice = confirm(
        "✅ 所有拼音已同步完成！\n\n" +
        "您可以：\n" +
        "• 按「確定」進行拼音到歌詞的 mapping\n" +
        "• 按「取消」稍後再進行（可直接下載）"
    );

    if (choice) {
        openGroupMappingDialog();
    }
}

// 更新拼音時間戳記顯示
function updatePinyinTimestampsDisplay() {
    let tableBody = document.querySelector("#timestampsTable tbody");
    tableBody.innerHTML = "";

    pinyinTimestamps.forEach(p => {
        let row = document.createElement("tr");
        let roleDisplay = p.role ? ROLE_NAMES[p.role] || p.role : '-';

        row.innerHTML = `
            <td>${p.syllable}</td>
            <td>${p.line}</td>
            <td>${p.syllableIndex}</td>
            <td>${p.start || "--:--:--"}</td>
            <td>${p.end || "--:--:--"}</td>
            <td>${roleDisplay}</td>
        `;

        tableBody.appendChild(row);
    });

    // 自動滾動到最新紀錄
    let tableWrapper = document.querySelector(".table-wrapper");
    if (tableWrapper) {
        tableWrapper.scrollTop = tableWrapper.scrollHeight;
    }
}

// 舊的 nextChar 函數（暫時保留用於向後相容，但已被 nextPinyinSyllable 取代）
function nextChar() {
    // 在新模式下，委派給 nextPinyinSyllable
    if (workflowPhase === 'SYNC_PINYIN') {
        nextPinyinSyllable();
    }
}

function prevLine() {
    if (currentLineIndex > 0) {
        addButtonEffect("prevLineBtn");

        // **1️⃣ 先抓取上一句（currentLineIndex - 1）的第一個字的時間戳記**
        let firstTimestamp = findFirstTimestampOfLine(currentLineIndex - 1);

        // **2️⃣ 設定 YouTube 播放器時間為 該時間戳記 -1 秒**
        if (firstTimestamp !== null && player && typeof player.seekTo === "function") {
            let targetTime = Math.max(0, firstTimestamp - 1); // 🔥 這裡可以調整秒數
            player.seekTo(targetTime, true);
        }

        // **3️⃣ 刪除本行及上一行的所有時間戳記**
        timestamps = timestamps.filter(t => t.line !== currentLineIndex + 1 && t.line !== currentLineIndex);

        // **4️⃣ 移動到上一行並更新顯示**
        currentLineIndex--;
        currentWordIndex = 0;
        displayLyrics();
        updateTimestampsDisplay();
    } else {
        // **如果已經在第一行則不做回溯，只是重置行索引**
        timestamps = [];
        currentLineIndex = 0;
        currentWordIndex = 0;
        displayLyrics();
        updateTimestampsDisplay();
    }
}

// **找到指定行的第一個字的時間戳記**
function findFirstTimestampOfLine(lineIndex) {
    for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i].line === lineIndex + 1) { // **找到該行第一個字**
            return parseTimeToSeconds(timestamps[i].start);
        }
    }
    return null;
}

function nextLine() {
    if (currentLineIndex < lyrics.length - 1) {
        addButtonEffect("nextLineBtn");
        currentLineIndex++;
        currentWordIndex = 0;
        displayLyrics();
    }
}
function resetAll() {
    currentLineIndex = 0;
    currentWordIndex = 0;
    timestamps = [];  // 清除時間碼紀錄
    displayLyrics();
    updateTimestampsDisplay();
}

let lastTimestampsUpdate = 0; // 記錄最後一次 timestamps 變動時間
// 更新逐字時間碼
function updateTimestampsDisplay() {
    let displayArea = document.getElementById("timestampsDisplay");

    // 使用 Map 來確保每個 `line-wordIndex` 只有一個紀錄，避免重複
    let uniqueTimestamps = new Map();

    timestamps.forEach(t => {
        let key = `${t.line}-${t.wordIndex}`;
        uniqueTimestamps.set(key, t); // 若重複則覆蓋
    });

    // 轉回陣列並排序，確保按照行數 & 單字索引排列
    timestamps = Array.from(uniqueTimestamps.values()).sort((a, b) =>
        a.line === b.line ? a.wordIndex - b.wordIndex : a.line - b.line
    );

    // 將時間紀錄格式化為清晰的換行顯示
    let formattedText = timestamps.map(t =>
        `Line ${t.line} | Word ${t.wordIndex} | ${t.start} → ${t.end} | ${t.word}`
    ).join("\n");

    updateTimestampsTable();

    updateProgressBar();
    updateLyricsStatus();
    lastTimestampsUpdate = Date.now();
}

// 角色名稱對應
const ROLE_NAMES = {
    '1': '男聲',
    '2': '女聲',
    '3': '合聲'
};

function updateTimestampsTable() {
    let tableBody = document.querySelector("#timestampsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    timestamps.forEach(t => {
        let row = document.createElement("tr");
        let roleDisplay = t.role ? ROLE_NAMES[t.role] || t.role : '-';

        row.innerHTML = `
            <td>${t.line}</td>
            <td>${t.word}</td>
            <td>${t.start || "--:--:--"}</td>
            <td>${t.end || "--:--:--"}</td>
            <td>${roleDisplay}</td>
        `;

        tableBody.appendChild(row);
    });

    // 自動滾動到最新的紀錄
    let tableWrapper = document.querySelector(".timestamps-details .table-wrapper");
    if (tableWrapper) {
        tableWrapper.scrollTop = tableWrapper.scrollHeight;
    }
}

function updateProgressBar() {
    let progressBar = document.getElementById("progressBar");
    if (!progressBar) return;

    let recordedCount = 0;
    let totalCount = totalWordsInSong;

    // 根據當前工作流程階段計算進度
    if (workflowPhase === 'SYNC_PINYIN') {
        // 拼音同步階段：基於已記錄的拼音音節數
        recordedCount = pinyinTimestamps.length;
        totalCount = pinyinLyrics.reduce((sum, line) => sum + line.length, 0);
    } else if (workflowPhase === 'MAPPING') {
        // Mapping 階段：基於已建立的 mapping 數量
        recordedCount = pinyinToLyricMappings.length;
        totalCount = lyrics.reduce((sum, line) => sum + line.length, 0);
    } else {
        // 舊模式或其他階段：基於 timestamps
        let recordedWords = new Set();
        timestamps.forEach(t => recordedWords.add(`${t.line}-${t.wordIndex}`));
        recordedCount = recordedWords.size;
    }

    // 計算進度
    let percentage = totalCount > 0 ? (recordedCount / totalCount) * 100 : 0;
    progressBar.style.width = `${percentage}%`;
}

// 匯出影片資訊
let videoTitle = player.getVideoData().title || "ktv_timestamps";
let videoUrl = document.getElementById("videoUrl").value || "未知網址";

function exportTimestamps() {
    // 優先使用 pinyinTimestamps（新工作流程），否則使用 timestamps
    let usePinyinData = pinyinTimestamps.length > 0;
    let dataSource = usePinyinData ? pinyinTimestamps : timestamps;

    if (dataSource.length === 0) {
        alert("❌ 沒有可下載的時間紀錄！");
        return;
    }

    // 取得 YouTube 影片標題 & 網址
    let videoTitle = player.getVideoData().title || "ktv_timestamps";
    let videoUrl = document.getElementById("videoUrl").value || "未知網址";

    // 建立內容標頭
    let header = `${videoTitle}\n${videoUrl}\n`;

    // 如果啟用拼音，加入標記
    if (pinyinEnabled) {
        header += "#PINYIN_ENABLED\n";
    }

    header += "\n";

    // 產生時間紀錄的內容
    let content;
    if (usePinyinData) {
        // 新工作流程：從 pinyinTimestamps 匯出，並結合主歌詞
        content = header + pinyinTimestamps.map(p => {
            // 取得對應的主歌詞字元（0-based index）
            let lineIdx = p.line - 1;
            let wordIdx = p.syllableIndex - 1;
            let mainWord = (lyrics[lineIdx] && lyrics[lineIdx][wordIdx]) ? lyrics[lineIdx][wordIdx] : p.syllable;

            let baseLine = `Line ${p.line} | Word ${p.syllableIndex} | ${p.start} → ${p.end} | ${mainWord} | ${p.syllable}`;
            // 如果有角色，加入角色欄位
            if (p.role) {
                baseLine += ` | ${p.role}`;
            }
            return baseLine;
        }).join("\n");
    } else {
        // 舊工作流程：從 timestamps 匯出
        content = header + timestamps.map(t => {
            let baseLine = `Line ${t.line} | Word ${t.wordIndex} | ${t.start} → ${t.end} | ${t.word}`;
            // 如果啟用拼音，加入拼音欄位
            if (pinyinEnabled) {
                baseLine += ` | ${t.pinyin || ''}`;
            }
            // 如果有角色，加入角色欄位
            if (t.role) {
                // 如果沒有拼音但有角色，需要先加一個空的拼音欄位
                if (!pinyinEnabled) {
                    baseLine += ` |`;
                }
                baseLine += ` | ${t.role}`;
            }
            return baseLine;
        }).join("\n");
    }

    // 加入結尾慶祝文字
    content += "\n\n☆～來賓請掌聲鼓勵～☆\n☆～把酒同歡 歡樂無限～☆";

    // 創建下載連結
    let blob = new Blob([content], { type: "text/plain" });
    let a = document.createElement("a");

    // 設定下載的檔案名稱為影片標題
    let safeTitle = videoTitle.replace(/[<>:"/\\|?*]+/g, ""); // 避免非法字元
    a.href = URL.createObjectURL(blob);
    a.download = `${safeTitle}.txt`; // 使用影片標題作為檔名

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateLyricsStatus() {
    let totalLines = lyrics.length;
    let currentLine = currentLineIndex + 1;
    let totalWordsInLine = lyrics[currentLineIndex]?.length || 0;

    let recordedWordsInLine = timestamps.filter(t =>
        t.line === currentLine && t.start && t.end
    ).length;

    // 更新新的進度指示器
    let progressIndicator = document.getElementById("timestampProgress");
    let lastRecordEl = document.getElementById("lastRecord");
    let downloadBtn = document.getElementById("downloadBtn");

    // 更新進度文字
    if (progressIndicator) {
        if (lyrics.length === 0) {
            progressIndicator.textContent = "尚未載入歌詞";
        } else {
            progressIndicator.textContent = `第 ${currentLine} 行 / 共 ${totalLines} 行 · 本行 ${recordedWordsInLine}/${totalWordsInLine} 字`;
        }
    }

    // 更新最後一筆記錄
    if (lastRecordEl && timestamps.length > 0) {
        let last = timestamps[timestamps.length - 1];
        lastRecordEl.textContent = `最後: ${last.start} → ${last.end}`;
    } else if (lastRecordEl) {
        lastRecordEl.textContent = "";
    }

    // 更新下載按鈕狀態（新工作流程支援 pinyinTimestamps）
    if (downloadBtn) {
        if (timestamps.length > 0 || pinyinTimestamps.length > 0) {
            downloadBtn.disabled = false;
            downloadBtn.classList.add("active");
        } else {
            downloadBtn.disabled = true;
            downloadBtn.classList.remove("active");
        }
    }

    // 檢查是否全部完成
    let allCompleted = lyrics.length > 0 && lyrics.every((line, index) => {
        let wordsInThisLine = line.length;
        let recordedWords = timestamps.filter(t =>
            t.line === index + 1 && t.start && t.end
        ).length;
        return recordedWords >= wordsInThisLine;
    });

    if (allCompleted) {
        if (progressIndicator) {
            progressIndicator.textContent = "逐字時間紀錄已完成!";
        }
        if (Date.now() - lastTimestampsUpdate < 1000) {
            launchFireworks();
        }
    }
}

// 展開/收起時間記錄詳情
function toggleTimestampDetails() {
    let container = document.querySelector(".timestamps-collapsible");
    if (container) {
        container.classList.toggle("expanded");
    }
}

// 展開/收起操作說明
function toggleHelp() {
    let helpPanel = document.getElementById("helpPanel");
    if (helpPanel) {
        helpPanel.classList.toggle("show");
    }
}

function launchFireworks() {
    let fireworksContainer = document.getElementById("fireworks-container");
    let overlay = document.getElementById("fireworks-overlay");

    // 避免重複播放煙火
    if (fireworksContainer.classList.contains("active")) return;

    // 🌙 啟動黑色半透明背景
    overlay.classList.add("active");

    fireworksContainer.classList.add("active");

    for (let i = 0; i < 10; i++) { // 限制煙火數量
        setTimeout(() => {
            let firework = document.createElement("div");
            firework.classList.add("firework");

            let x = Math.random() * window.innerWidth;
            let y = Math.random() * window.innerHeight * 0.5;
            let color = `hsl(${Math.random() * 360}, 100%, 70%)`;

            firework.style.left = `${x}px`;
            firework.style.top = `${y}px`;
            firework.style.backgroundColor = color;

            fireworksContainer.appendChild(firework);

            // 🎇 產生粒子爆炸
            for (let j = 0; j < 15; j++) {
                let particle = document.createElement("div");
                particle.classList.add("particle");

                let angle = Math.random() * Math.PI * 2;
                let distance = Math.random() * 80 + 20;
                let particleX = Math.cos(angle) * distance;
                let particleY = Math.sin(angle) * distance;

                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;
                particle.style.backgroundColor = color;

                particle.style.setProperty("--x", `${particleX}px`);
                particle.style.setProperty("--y", `${particleY}px`);

                fireworksContainer.appendChild(particle);

                setTimeout(() => {
                    particle.remove();
                }, 1500);
            }

            setTimeout(() => {
                firework.remove();
            }, 1500);
        }, i * 300);
    }

    // 4 秒後清除煙火 & 移除黑底
    setTimeout(() => {
        fireworksContainer.classList.remove("active");
        overlay.classList.remove("active"); // 🌙 移除黑色背景
    }, 4000);
}

// ==============================================
// Group Mapping Feature (Pre-Processing)
// ==============================================

// ========== Dialog Lifecycle ==========

function openGroupMappingDialog() {
    // Check if there are existing mappings
    if (pinyinToLyricMappings && pinyinToLyricMappings.length > 0) {
        if (!confirm("偵測到已有群組 mapping 紀錄。\n\n重新開始會清除之前的 mapping，是否繼續？")) {
            return;
        }
    }

    // Prepare data
    let data = prepareGroupMappingData();
    if (!data) return;

    // Initialize state
    groupMappingState.currentLine = 0;
    groupMappingState.pinyinData = data.pinyinLines;
    groupMappingState.lyricsData = data.lyricsLines;
    groupMappingState.mappings = [];
    groupMappingState.selection = [];
    groupMappingState.pinyinFocus = 0;
    groupMappingState.lyricFocus = 0;

    // Render interface
    renderGroupMappingInterface();

    // Show dialog
    let dialog = document.getElementById("groupMappingDialog");
    dialog.showModal();

    // Attach keyboard handlers
    attachGroupMappingKeyboardHandlers();
}


function closeGroupMappingDialog() {
    // Check if there are unsaved mappings
    if (groupMappingState.mappings.length > 0) {
        if (!confirm("您有未儲存的 mapping 紀錄。\n\n關閉視窗將會遺失這些紀錄，是否繼續？")) {
            return;
        }
    }

    let dialog = document.getElementById("groupMappingDialog");
    dialog.close();
    removeGroupMappingKeyboardHandlers();
}

// ========== Data Parsing ==========

function prepareGroupMappingData() {
    let pinyinInput = document.getElementById("pinyinInput").value.trim();
    let lyricsInput = document.getElementById("lyricsInput").value.trim();

    if (!pinyinInput) {
        alert("❌ 請先輸入拼音！");
        return null;
    }

    if (!lyricsInput) {
        alert("❌ 請先輸入主歌詞！");
        return null;
    }

    // Parse both inputs line by line
    let pinyinLines = pinyinInput.split("\n")
        .map(line => parsePinyinLineForGrouping(line))
        .filter(line => line.length > 0);

    let lyricsLines = lyricsInput.split("\n")
        .map(line => parseLyricsLine(line))
        .filter(line => line.length > 0);

    // Validate line count
    if (pinyinLines.length !== lyricsLines.length) {
        alert(`❌ 行數不對齊！\n拼音：${pinyinLines.length} 行\n主歌詞：${lyricsLines.length} 行`);
        return null;
    }

    // Debug: log the data
    console.log('Prepared data:', {
        pinyinLines: pinyinLines,
        lyricsLines: lyricsLines
    });

    return {
        pinyinLines: pinyinLines,
        lyricsLines: lyricsLines,
        lineCount: pinyinLines.length
    };
}

function parsePinyinLineForGrouping(line) {
    // Remove existing [] groups first
    let cleaned = line.replace(/\[([^\]]+)\]/g, (_match, group) => {
        return group.trim();
    });

    // Use parseLyricsLine to handle / and automatic segmentation
    return parseLyricsLine(cleaned);
}

// ========== Interface Rendering ==========

function renderGroupMappingInterface() {
    let container = document.getElementById("groupMappingArea");
    let line = groupMappingState.currentLine;
    let pinyinList = groupMappingState.pinyinData[line];
    let lyricsList = groupMappingState.lyricsData[line];
    let lineMappings = groupMappingState.mappings.filter(m => m.line === line);

    // Debug
    console.log('Rendering line:', line);
    console.log('Pinyin list:', pinyinList);
    console.log('Lyrics list:', lyricsList);

    // Render pinyin list
    let pinyinHTML = pinyinList.map((syllable, idx) => {
        let classes = ['pinyin-item'];
        if (idx === groupMappingState.pinyinFocus) classes.push('focused');
        if (groupMappingState.selection.includes(idx)) classes.push('selected');
        if (isMappedPinyin(line, idx)) classes.push('mapped');
        return `<div class="${classes.join(' ')}" data-idx="${idx}">${syllable}</div>`;
    }).join('');

    // Render lyrics list with color indicators
    let lyricsHTML = lyricsList.map((char, idx) => {
        let classes = ['lyric-item'];
        if (idx === groupMappingState.lyricFocus) classes.push('focused');

        // Check if this lyric is mapped
        let mapping = lineMappings.find(m => m.lyricIdx === idx);
        if (mapping) {
            classes.push('mapped');
            // Add pinyin annotation on top
            let pinyinAnnotation = `<div class="lyric-pinyin-annotation">${mapping.pinyin}</div>`;
            return `<div class="${classes.join(' ')}" data-idx="${idx}">${pinyinAnnotation}<div class="lyric-char">${char}</div></div>`;
        }

        return `<div class="${classes.join(' ')}" data-idx="${idx}">${char}</div>`;
    }).join('');

    // Progress info
    let progressHTML = getMappingProgress(line);

    container.innerHTML = `
        <!-- 上方：拼音列表 -->
        <div class="mapping-section">
            <div class="section-title">拼音音節（← → 移動，Space 選取/取消）</div>
            <div class="pinyin-list-horizontal">
                ${pinyinHTML}
            </div>
        </div>

        <!-- 下方：主歌詞列表（帶有拼音標註）-->
        <div class="mapping-section">
            <div class="section-title">主歌詞（W/A 左移，D 右移，Enter 連結 | Backspace 刪除上一個）</div>
            <div class="lyrics-list-horizontal">
                ${lyricsHTML}
            </div>
        </div>

        <!-- 進度提示 -->
        <div class="mapping-progress">
            ${progressHTML}
        </div>
    `;

    // Attach click handlers
    attachGroupMappingClickHandlers();
}

function renderLineMappings(mappings) {
    if (mappings.length === 0) {
        return '<div class="mappings-display-empty">尚未建立連結</div>';
    }

    return mappings.map((m) => {
        // Find the global index for this mapping
        let globalIdx = groupMappingState.mappings.indexOf(m);
        return `
            <div class="mapping-entry">
                <span class="pinyin-part">${m.pinyin}</span>
                <span class="arrow">→</span>
                <span class="lyric-part">${m.lyric}</span>
                <button class="delete-btn" onclick="deleteGroupMapping(${globalIdx})">刪除</button>
            </div>
        `;
    }).join('');
}

function getMappingProgress(line) {
    let pinyinList = groupMappingState.pinyinData[line];
    let lyricsList = groupMappingState.lyricsData[line];
    let lineMappings = groupMappingState.mappings.filter(m => m.line === line);

    let mappedPinyin = new Set();
    lineMappings.forEach(m => {
        m.pinyinIndices.forEach(idx => mappedPinyin.add(idx));
    });

    let mappedLyrics = new Set(lineMappings.map(m => m.lyricIdx));

    let lineInfo = `<span>第 ${line + 1} 行 / 共 ${groupMappingState.pinyinData.length} 行</span>`;
    let completeness = `<span>拼音：${mappedPinyin.size}/${pinyinList.length} | 主歌詞：${mappedLyrics.size}/${lyricsList.length}</span>`;

    return lineInfo + completeness;
}

// ========== Helper Functions ==========

function isMappedPinyin(line, idx) {
    return groupMappingState.mappings.some(m =>
        m.line === line && m.pinyinIndices.includes(idx)
    );
}

function isMappedLyric(line, idx) {
    return groupMappingState.mappings.some(m =>
        m.line === line && m.lyricIdx === idx
    );
}

// ========== Interaction Logic ==========

function attachGroupMappingKeyboardHandlers() {
    groupMappingKeyboardHandler = (e) => {
        let line = groupMappingState.currentLine;
        let pinyinList = groupMappingState.pinyinData[line];
        let lyricsList = groupMappingState.lyricsData[line];

        // Pinyin navigation: ← →
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (groupMappingState.pinyinFocus > 0) {
                groupMappingState.pinyinFocus--;
                renderGroupMappingInterface();
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (groupMappingState.pinyinFocus < pinyinList.length - 1) {
                groupMappingState.pinyinFocus++;
                renderGroupMappingInterface();
            }
        }
        // Pinyin selection: Space
        else if (e.key === ' ') {
            e.preventDefault();
            togglePinyinSelection(groupMappingState.pinyinFocus);

            // Auto-advance to next pinyin after selection
            if (groupMappingState.pinyinFocus < pinyinList.length - 1) {
                groupMappingState.pinyinFocus++;
                renderGroupMappingInterface();
            }
        }
        // Lyric navigation: W/A (left), D (right)
        else if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'a') {
            e.preventDefault();
            if (groupMappingState.lyricFocus > 0) {
                groupMappingState.lyricFocus--;
                renderGroupMappingInterface();
            }
        } else if (e.key.toLowerCase() === 'd') {
            e.preventDefault();
            if (groupMappingState.lyricFocus < lyricsList.length - 1) {
                groupMappingState.lyricFocus++;
                renderGroupMappingInterface();
            }
        }
        // Create mapping: Enter
        else if (e.key === 'Enter') {
            e.preventDefault();
            createGroupMapping();
        }
        // Delete last mapping: Backspace
        else if (e.key === 'Backspace') {
            e.preventDefault();
            deleteLastGroupMapping();
        }
        // Clear selection or close: Escape
        else if (e.key === 'Escape') {
            e.preventDefault();
            if (groupMappingState.selection.length > 0) {
                // First ESC: Clear selection
                groupMappingState.selection = [];
                renderGroupMappingInterface();
            } else {
                // Second ESC: Close dialog
                closeGroupMappingDialog();
            }
        }
    };

    document.addEventListener('keydown', groupMappingKeyboardHandler);
}

function removeGroupMappingKeyboardHandlers() {
    if (groupMappingKeyboardHandler) {
        document.removeEventListener('keydown', groupMappingKeyboardHandler);
        groupMappingKeyboardHandler = null;
    }
}

function attachGroupMappingClickHandlers() {
    // Pinyin items
    document.querySelectorAll('.pinyin-item').forEach(item => {
        item.addEventListener('click', () => {
            let idx = parseInt(item.dataset.idx);
            if (!item.classList.contains('mapped')) {
                togglePinyinSelection(idx);
            }
        });
    });

    // Lyric items
    document.querySelectorAll('.lyric-item').forEach(item => {
        item.addEventListener('click', () => {
            let idx = parseInt(item.dataset.idx);
            if (!item.classList.contains('mapped')) {
                groupMappingState.lyricFocus = idx;
                createGroupMapping();
            }
        });
    });
}

function togglePinyinSelection(idx) {
    let line = groupMappingState.currentLine;

    // Check if already mapped
    if (isMappedPinyin(line, idx)) return;

    let selection = groupMappingState.selection;
    let position = selection.indexOf(idx);

    if (position !== -1) {
        // Remove selection
        selection.splice(position, 1);
    } else {
        // Add selection
        selection.push(idx);
        selection.sort((a, b) => a - b);
    }

    renderGroupMappingInterface();
}

function createGroupMapping() {
    let line = groupMappingState.currentLine;
    let lyricIdx = groupMappingState.lyricFocus;
    let selection = groupMappingState.selection;

    // Validation
    if (selection.length === 0) {
        alert("請先選取拼音音節！");
        return;
    }

    if (isMappedLyric(line, lyricIdx)) {
        alert("這個字已經被連結過了！");
        return;
    }

    // Check if selected pinyin already mapped
    let alreadyMapped = selection.some(idx => isMappedPinyin(line, idx));
    if (alreadyMapped) {
        alert("選取的拼音中有些已經被 mapping 過了！");
        return;
    }

    // Create mapping
    let pinyinList = groupMappingState.pinyinData[line];
    let lyricsList = groupMappingState.lyricsData[line];

    let mapping = {
        line: line,
        pinyinIndices: [...selection],
        lyricIdx: lyricIdx,
        pinyin: selection.map(idx => pinyinList[idx]).join(' '),
        lyric: lyricsList[lyricIdx]
    };

    groupMappingState.mappings.push(mapping);

    // Clear selection
    groupMappingState.selection = [];

    // Auto-advance to next lyric
    if (groupMappingState.lyricFocus < lyricsList.length - 1) {
        groupMappingState.lyricFocus++;
    }

    renderGroupMappingInterface();
}

function deleteGroupMapping(globalIdx) {
    groupMappingState.mappings.splice(globalIdx, 1);
    renderGroupMappingInterface();
}

function deleteLastGroupMapping() {
    let line = groupMappingState.currentLine;
    let lineMappings = groupMappingState.mappings.filter(m => m.line === line);

    if (lineMappings.length === 0) {
        return; // No mappings to delete
    }

    // Find the last mapping for this line
    let lastMapping = lineMappings[lineMappings.length - 1];
    let globalIdx = groupMappingState.mappings.indexOf(lastMapping);

    // Delete it
    groupMappingState.mappings.splice(globalIdx, 1);

    // Move lyric focus to the deleted mapping position
    groupMappingState.lyricFocus = lastMapping.lyricIdx;

    renderGroupMappingInterface();
}

// ========== Line Navigation ==========

function nextGroupMappingLine() {
    if (groupMappingState.currentLine >= groupMappingState.pinyinData.length - 1) {
        return;
    }

    let validation = validateLineMapping(groupMappingState.currentLine);
    if (!validation.complete) {
        if (!confirm(`第 ${groupMappingState.currentLine + 1} 行尚未完成 mapping：\n${validation.message}\n\n是否仍要繼續到下一行？`)) {
            return;
        }
    }

    groupMappingState.currentLine++;
    groupMappingState.selection = [];
    groupMappingState.pinyinFocus = 0;
    groupMappingState.lyricFocus = 0;
    renderGroupMappingInterface();
}

function prevGroupMappingLine() {
    if (groupMappingState.currentLine <= 0) {
        return;
    }

    groupMappingState.currentLine--;
    groupMappingState.selection = [];
    groupMappingState.pinyinFocus = 0;
    groupMappingState.lyricFocus = 0;
    renderGroupMappingInterface();
}

function validateLineMapping(line) {
    let pinyinList = groupMappingState.pinyinData[line];
    let lyricsList = groupMappingState.lyricsData[line];
    let lineMappings = groupMappingState.mappings.filter(m => m.line === line);

    // Check all pinyin mapped
    let mappedPinyin = new Set();
    lineMappings.forEach(m => {
        m.pinyinIndices.forEach(idx => mappedPinyin.add(idx));
    });

    if (mappedPinyin.size < pinyinList.length) {
        return {
            complete: false,
            message: `還有 ${pinyinList.length - mappedPinyin.size} 個拼音音節未 mapping`
        };
    }

    // Check all lyrics mapped
    let mappedLyrics = new Set(lineMappings.map(m => m.lyricIdx));
    if (mappedLyrics.size < lyricsList.length) {
        return {
            complete: false,
            message: `還有 ${lyricsList.length - mappedLyrics.size} 個主歌詞字元未 mapping`
        };
    }

    return { complete: true };
}

// ========== Data Output ==========

function generateGroupedPinyinText() {
    let result = [];

    for (let lineIdx = 0; lineIdx < groupMappingState.pinyinData.length; lineIdx++) {
        let lineMappings = groupMappingState.mappings
            .filter(m => m.line === lineIdx)
            .sort((a, b) => a.lyricIdx - b.lyricIdx);

        if (lineMappings.length === 0) {
            // No mappings for this line, return original
            result.push(groupMappingState.pinyinData[lineIdx].join(' '));
            continue;
        }

        let lineGroups = lineMappings.map(m => {
            let syllables = m.pinyinIndices.map(idx =>
                groupMappingState.pinyinData[lineIdx][idx]
            );

            // If multiple syllables, wrap in []
            if (syllables.length > 1) {
                return `[${syllables.join(' ')}]`;
            } else {
                return syllables[0];
            }
        });

        result.push(lineGroups.join(' '));
    }

    return result.join('\n');
}

/**
 * Merge pinyinTimestamps when multiple pinyin syllables are mapped to one character.
 * - Automatically detects if timestamps exist
 * - Combines start time from first syllable and end time from last syllable
 * - Re-indexes syllableIndex to ensure sequential numbering
 */
function mergePinyinTimestamps() {
    // Skip if no timestamps exist (text-only mapping mode)
    if (pinyinTimestamps.length === 0) {
        return;
    }

    // Build a map of multi-syllable mappings
    // Key: "line-firstSyllableIndex" (1-based), Value: mapping info
    let mergeMap = new Map();

    groupMappingState.mappings.forEach(mapping => {
        if (mapping.pinyinIndices.length > 1) {
            // Convert to 1-based indices to match pinyinTimestamps
            let line = mapping.line + 1;
            let firstIdx = mapping.pinyinIndices[0] + 1;
            let key = `${line}-${firstIdx}`;
            mergeMap.set(key, {
                line: line,
                pinyinIndices: mapping.pinyinIndices.map(i => i + 1),
                combinedPinyin: mapping.pinyin
            });
        }
    });

    // If no multi-syllable mappings, nothing to merge
    if (mergeMap.size === 0) {
        return;
    }

    // Track which entries to remove and new merged entries
    let indicesToRemove = new Set();
    let mergedEntries = [];

    mergeMap.forEach((mergeInfo) => {
        // Find all timestamp entries for this merge group
        let groupEntries = mergeInfo.pinyinIndices.map(syllableIdx => {
            return pinyinTimestamps.find(p =>
                p.line === mergeInfo.line && p.syllableIndex === syllableIdx
            );
        }).filter(Boolean);

        // Only merge if ALL syllables have timestamps
        if (groupEntries.length === mergeInfo.pinyinIndices.length) {
            // Create merged entry
            let mergedEntry = {
                line: mergeInfo.line,
                syllableIndex: mergeInfo.pinyinIndices[0], // Keep first index temporarily
                start: groupEntries[0].start,
                end: groupEntries[groupEntries.length - 1].end,
                syllable: mergeInfo.combinedPinyin,
                role: groupEntries[0].role,
                mappedToWord: null
            };

            mergedEntries.push(mergedEntry);

            // Mark all original entries for removal
            mergeInfo.pinyinIndices.forEach(syllableIdx => {
                indicesToRemove.add(`${mergeInfo.line}-${syllableIdx}`);
            });
        }
    });

    // Build new array: keep non-merged entries, add merged entries
    let newTimestamps = [];

    pinyinTimestamps.forEach(entry => {
        let key = `${entry.line}-${entry.syllableIndex}`;
        if (!indicesToRemove.has(key)) {
            newTimestamps.push({ ...entry });
        }
    });

    // Add merged entries
    newTimestamps.push(...mergedEntries);

    // Sort by line and syllableIndex
    newTimestamps.sort((a, b) => {
        if (a.line !== b.line) return a.line - b.line;
        return a.syllableIndex - b.syllableIndex;
    });

    // Re-index syllableIndex to be sequential within each line
    let lineCounters = {};
    newTimestamps.forEach(entry => {
        if (!lineCounters[entry.line]) {
            lineCounters[entry.line] = 1;
        }
        entry.syllableIndex = lineCounters[entry.line]++;
    });

    // Replace global array
    pinyinTimestamps = newTimestamps;

    console.log('Merged pinyinTimestamps:', pinyinTimestamps);
}

function saveGroupMappings() {
    // Validate all lines
    let incomplete = [];
    for (let i = 0; i < groupMappingState.pinyinData.length; i++) {
        let validation = validateLineMapping(i);
        if (!validation.complete) {
            incomplete.push(`第 ${i + 1} 行：${validation.message}`);
        }
    }

    if (incomplete.length > 0) {
        if (!confirm(`以下行尚未完成 mapping：\n\n${incomplete.join('\n')}\n\n是否仍要儲存？（未完成的行不會套用群組語法）`)) {
            return;
        }
    }

    // Generate grouped text
    let groupedText = generateGroupedPinyinText();

    // Update pinyinInput textarea
    document.getElementById("pinyinInput").value = groupedText;

    // Merge timestamps if they exist (auto-detect mode)
    mergePinyinTimestamps();

    // Store mappings in global variable (convert to 1-based for consistency)
    pinyinToLyricMappings = groupMappingState.mappings.map(m => ({
        ...m,
        line: m.line + 1,
        lyricIdx: m.lyricIdx + 1, // Convert to 1-based
        wordIndex: m.lyricIdx + 1
    }));

    // Show success message
    alert("✅ 拼音群組已儲存到輸入欄位！\n\n拼音已更新為群組格式，請確認結果。");

    // Close dialog
    let dialog = document.getElementById("groupMappingDialog");
    dialog.close();
    removeGroupMappingKeyboardHandlers();
}
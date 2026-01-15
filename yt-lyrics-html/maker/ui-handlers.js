/**
 * YouTube KTV Lyrics - UI Handlers Module
 * 負責 UI 事件處理
 */

const UIHandlers = (function() {
    'use strict';

    // 角色名稱對應
    const ROLE_NAMES = {
        '1': '男聲',
        '2': '女聲',
        '3': '合聲'
    };

    let lastTimestampsUpdate = 0;

    /**
     * 設定角色
     */
    function setRole(role) {
        MakerState.currentRole = role;
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.role === role);
        });
    }

    /**
     * 模擬按鈕的 hover 效果
     */
    function addButtonEffect(buttonId) {
        let button = document.getElementById(buttonId);
        if (button) {
            button.classList.add("active");
            setTimeout(() => {
                button.classList.remove("active");
            }, 100);
        }
    }

    /**
     * 顯示當前行的 KTV 歌詞
     */
    function displayLyrics() {
        let displayArea = document.getElementById("lyricsDisplay");

        if (MakerState.lyrics.length === 0 || MakerState.currentLineIndex >= MakerState.lyrics.length) {
            displayArea.innerHTML = "";
            return;
        }

        displayArea.innerHTML = MakerState.lyrics[MakerState.currentLineIndex]
            .filter(word => word.trim() !== "")
            .map((word, index) => {
                let pinyinText = "";
                if (MakerState.pinyinEnabled && MakerState.pinyinLyrics[MakerState.currentLineIndex] &&
                    MakerState.pinyinLyrics[MakerState.currentLineIndex][index]) {
                    pinyinText = `<span class="pinyin-preview">${MakerState.pinyinLyrics[MakerState.currentLineIndex][index]}</span>`;
                }
                return `<span id="word-${index}" class="word">${pinyinText}<span class="main-word">${word}</span></span>`;
            }).join("");

        updateLyricsStatus();
    }

    /**
     * 顯示拼音同步介面
     */
    function displayPinyinSyncInterface() {
        let container = document.getElementById("lyricsDisplay");
        container.innerHTML = "";

        if (MakerState.pinyinLyrics.length === 0 || MakerState.currentLineIndex >= MakerState.pinyinLyrics.length) {
            return;
        }

        // 顯示主歌詞作為小字提示
        let mainLyricPreview = document.createElement("div");
        mainLyricPreview.className = "main-lyric-preview";
        mainLyricPreview.textContent = `主歌詞：${MakerState.lyrics[MakerState.currentLineIndex].join("")}`;
        container.appendChild(mainLyricPreview);

        // 顯示拼音音節
        let pinyinLine = document.createElement("div");
        pinyinLine.className = "pinyin-line";
        MakerState.pinyinLyrics[MakerState.currentLineIndex].forEach((syllable, idx) => {
            let span = document.createElement("span");
            span.id = `pinyin-${idx}`;
            span.className = "pinyin-syllable";
            span.textContent = syllable;

            let recorded = MakerState.pinyinTimestamps.find(p =>
                p.line === MakerState.currentLineIndex + 1 && p.syllableIndex === idx + 1
            );
            if (recorded) {
                span.classList.add("highlight");
            }

            pinyinLine.appendChild(span);
        });
        container.appendChild(pinyinLine);

        updateLyricsStatus();
    }

    /**
     * 更新時間戳記顯示
     */
    function updateTimestampsDisplay() {
        // 使用 Map 確保唯一性
        let uniqueTimestamps = new Map();

        MakerState.timestamps.forEach(t => {
            let key = `${t.line}-${t.wordIndex}`;
            uniqueTimestamps.set(key, t);
        });

        MakerState.timestamps = Array.from(uniqueTimestamps.values()).sort((a, b) =>
            a.line === b.line ? a.wordIndex - b.wordIndex : a.line - b.line
        );

        updateTimestampsTable();
        updateProgressBar();
        updateLyricsStatus();
        lastTimestampsUpdate = Date.now();
    }

    /**
     * 更新時間戳記表格
     */
    function updateTimestampsTable() {
        let tableBody = document.querySelector("#timestampsTable tbody");
        if (!tableBody) return;
        tableBody.innerHTML = "";

        MakerState.timestamps.forEach(t => {
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

        let tableWrapper = document.querySelector(".timestamps-details .table-wrapper");
        if (tableWrapper) {
            tableWrapper.scrollTop = tableWrapper.scrollHeight;
        }
    }

    /**
     * 更新拼音時間戳記顯示
     */
    function updatePinyinTimestampsDisplay() {
        let tableBody = document.querySelector("#timestampsTable tbody");
        tableBody.innerHTML = "";

        MakerState.pinyinTimestamps.forEach(p => {
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

        let tableWrapper = document.querySelector(".table-wrapper");
        if (tableWrapper) {
            tableWrapper.scrollTop = tableWrapper.scrollHeight;
        }
    }

    /**
     * 更新進度條
     */
    function updateProgressBar() {
        let progressBar = document.getElementById("progressBar");
        if (!progressBar) return;

        let recordedCount = 0;
        let totalCount = MakerState.totalWordsInSong;

        if (MakerState.workflowPhase === 'SYNC_PINYIN') {
            recordedCount = MakerState.pinyinTimestamps.length;
            totalCount = MakerState.pinyinLyrics.reduce((sum, line) => sum + line.length, 0);
        } else if (MakerState.workflowPhase === 'MAPPING') {
            recordedCount = MakerState.pinyinToLyricMappings.length;
            totalCount = MakerState.lyrics.reduce((sum, line) => sum + line.length, 0);
        } else {
            let recordedWords = new Set();
            MakerState.timestamps.forEach(t => recordedWords.add(`${t.line}-${t.wordIndex}`));
            recordedCount = recordedWords.size;
        }

        let percentage = totalCount > 0 ? (recordedCount / totalCount) * 100 : 0;
        progressBar.style.width = `${percentage}%`;
    }

    /**
     * 更新歌詞狀態
     */
    function updateLyricsStatus() {
        let totalLines = MakerState.lyrics.length;
        let currentLine = MakerState.currentLineIndex + 1;
        let totalWordsInLine = MakerState.lyrics[MakerState.currentLineIndex]?.length || 0;

        let recordedWordsInLine = MakerState.timestamps.filter(t =>
            t.line === currentLine && t.start && t.end
        ).length;

        let progressIndicator = document.getElementById("timestampProgress");
        let lastRecordEl = document.getElementById("lastRecord");
        let downloadBtn = document.getElementById("downloadBtn");

        if (progressIndicator) {
            if (MakerState.lyrics.length === 0) {
                progressIndicator.textContent = "尚未載入歌詞";
            } else {
                progressIndicator.textContent = `第 ${currentLine} 行 / 共 ${totalLines} 行 · 本行 ${recordedWordsInLine}/${totalWordsInLine} 字`;
            }
        }

        if (lastRecordEl && MakerState.timestamps.length > 0) {
            let last = MakerState.timestamps[MakerState.timestamps.length - 1];
            lastRecordEl.textContent = `最後: ${last.start} → ${last.end}`;
        } else if (lastRecordEl) {
            lastRecordEl.textContent = "";
        }

        if (downloadBtn) {
            if (MakerState.timestamps.length > 0 || MakerState.pinyinTimestamps.length > 0) {
                downloadBtn.disabled = false;
                downloadBtn.classList.add("active");
            } else {
                downloadBtn.disabled = true;
                downloadBtn.classList.remove("active");
            }
        }

        // 檢查是否全部完成
        let allCompleted = MakerState.lyrics.length > 0 && MakerState.lyrics.every((line, index) => {
            let wordsInThisLine = line.length;
            let recordedWords = MakerState.timestamps.filter(t =>
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

    /**
     * 展開/收起時間記錄詳情
     */
    function toggleTimestampDetails() {
        let container = document.querySelector(".timestamps-collapsible");
        if (container) {
            container.classList.toggle("expanded");
        }
    }

    /**
     * 展開/收起操作說明
     */
    function toggleHelp() {
        let helpPanel = document.getElementById("helpPanel");
        if (helpPanel) {
            helpPanel.classList.toggle("show");
        }
    }

    /**
     * 煙火慶祝效果
     */
    function launchFireworks() {
        let fireworksContainer = document.getElementById("fireworks-container");
        let overlay = document.getElementById("fireworks-overlay");

        if (fireworksContainer.classList.contains("active")) return;

        overlay.classList.add("active");
        fireworksContainer.classList.add("active");

        for (let i = 0; i < 10; i++) {
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

        setTimeout(() => {
            fireworksContainer.classList.remove("active");
            overlay.classList.remove("active");
        }, 4000);
    }

    /**
     * 取得點擊的行數索引
     */
    function getClickedLineIndex(textarea, event) {
        let text = textarea.value.substr(0, textarea.selectionStart);
        let inputLines = textarea.value.split("\n");

        let nonEmptyLines = inputLines
            .map((line, index) => ({ index, text: line.trim() }))
            .filter(line => line.text.length > 0);

        let lineIndex = text.split("\n").length - 1;
        let mappedIndex = nonEmptyLines.findIndex(line => line.index === lineIndex);

        return mappedIndex !== -1 ? mappedIndex : null;
    }

    /**
     * 設定鍵盤事件處理
     */
    function setupKeyboardHandlers() {
        document.addEventListener("keydown", (event) => {
            let activeElement = document.activeElement;

            if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
                return;
            }

            // 角色選擇快捷鍵
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
            // KTV 字幕快捷鍵
            else if (event.code === "Space" || event.code === "ArrowRight") {
                event.preventDefault();
                SyncRecorder.nextChar();
            } else if (event.code === "ArrowLeft") {
                event.preventDefault();
                SyncRecorder.restartCurrentLine();
            } else if (event.code === "ArrowUp") {
                event.preventDefault();
                SyncRecorder.prevLine();
            } else if (event.code === "ArrowDown") {
                event.preventDefault();
                SyncRecorder.nextLine();
            }
        });

        // 角色選擇按鈕事件
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                setRole(this.dataset.role);
            });
        });

        // 歌詞輸入框點擊事件
        let lyricsInput = document.getElementById("lyricsInput");
        if (lyricsInput) {
            lyricsInput.addEventListener("click", function(event) {
                let clickedLineIndex = getClickedLineIndex(this, event);

                if (clickedLineIndex !== null && clickedLineIndex < MakerState.lyrics.length) {
                    MakerState.currentLineIndex = clickedLineIndex;
                    displayLyrics();
                    MakerState.currentWordIndex = 0;
                }
            });
        }
    }

    return {
        setRole,
        addButtonEffect,
        displayLyrics,
        displayPinyinSyncInterface,
        updateTimestampsDisplay,
        updateTimestampsTable,
        updatePinyinTimestampsDisplay,
        updateProgressBar,
        updateLyricsStatus,
        toggleTimestampDetails,
        toggleHelp,
        launchFireworks,
        getClickedLineIndex,
        setupKeyboardHandlers,
        ROLE_NAMES
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIHandlers;
}

/**
 * YouTube KTV Lyrics Extension - Popup Script
 */

(function() {
    'use strict';

    // DOM 元素
    const elements = {
        enableToggle: document.getElementById('enableToggle'),
        statusMessage: document.getElementById('statusMessage'),
        videoInfo: document.getElementById('videoInfo'),
        videoTitle: document.getElementById('videoTitle'),
        subtitleFile: document.getElementById('subtitleFile'),
        uploadStatus: document.getElementById('uploadStatus'),
        fontSelector: document.getElementById('fontSelector'),
        fontSizeSlider: document.getElementById('fontSizeSlider'),
        fontSizeValue: document.getElementById('fontSizeValue'),
        highlightColor: document.getElementById('highlightColor'),
        shadowColor: document.getElementById('shadowColor'),
        timeOffset: document.getElementById('timeOffset'),
        timeOffsetValue: document.getElementById('timeOffsetValue'),
        openOptions: document.getElementById('openOptions')
    };

    // 當前狀態
    let currentStatus = {
        videoId: null,
        hasSubtitle: false,
        title: null
    };

    /**
     * 初始化
     */
    async function init() {
        // 載入設定
        await loadSettings();

        // 載入啟用狀態
        await loadEnabledState();

        // 取得當前頁面狀態
        await getCurrentStatus();

        // 綁定事件
        bindEvents();
    }

    /**
     * 載入設定
     */
    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get('settings');
            const settings = result.settings || getDefaultSettings();

            elements.fontSelector.value = settings.font || 'NotoSans';
            elements.fontSizeSlider.value = settings.fontSize || 40;
            elements.fontSizeValue.textContent = `${settings.fontSize || 40}px`;
            elements.highlightColor.value = settings.highlightColor || '#80D9E5';
            elements.shadowColor.value = settings.shadowColor || '#1D1B1B';

            const offset = settings.timeOffset || 0;
            elements.timeOffset.value = offset * 100;
            elements.timeOffsetValue.textContent = `${offset.toFixed(2)}s`;
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * 取得預設設定
     */
    function getDefaultSettings() {
        return {
            font: 'NotoSans',
            fontSize: 40,
            highlightColor: '#80D9E5',
            shadowColor: '#1D1B1B',
            timeOffset: 0
        };
    }

    /**
     * 載入啟用狀態
     */
    async function loadEnabledState() {
        try {
            const result = await chrome.storage.sync.get('enabled');
            elements.enableToggle.checked = result.enabled !== false;
        } catch (error) {
            console.error('Failed to load enabled state:', error);
        }
    }

    /**
     * 取得當前頁面狀態
     */
    async function getCurrentStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url || !tab.url.includes('youtube.com/watch')) {
                updateStatusDisplay('not-youtube');
                return;
            }

            // 嘗試從 content script 取得狀態
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });

                if (response && response.success) {
                    currentStatus = {
                        videoId: response.videoId,
                        hasSubtitle: response.hasSubtitle,
                        title: response.title
                    };

                    if (response.hasSubtitle) {
                        updateStatusDisplay('has-subtitle', response.title);
                    } else {
                        updateStatusDisplay('no-subtitle');
                    }
                } else {
                    updateStatusDisplay('no-subtitle');
                }
            } catch (error) {
                // Content script 可能尚未載入
                updateStatusDisplay('loading');
            }
        } catch (error) {
            console.error('Failed to get current status:', error);
            updateStatusDisplay('error');
        }
    }

    /**
     * 更新狀態顯示
     */
    function updateStatusDisplay(status, title = null) {
        const statusMessage = elements.statusMessage;
        const videoInfo = elements.videoInfo;

        statusMessage.className = 'status-message';
        videoInfo.classList.add('hidden');

        switch (status) {
            case 'has-subtitle':
                statusMessage.innerHTML = '<span class="status-icon">✅</span><span class="status-text">已載入字幕</span>';
                statusMessage.classList.add('success');
                if (title) {
                    elements.videoTitle.textContent = title;
                    videoInfo.classList.remove('hidden');
                }
                break;

            case 'no-subtitle':
                statusMessage.innerHTML = '<span class="status-icon">📭</span><span class="status-text">此影片尚無字幕</span>';
                statusMessage.classList.add('warning');
                break;

            case 'not-youtube':
                statusMessage.innerHTML = '<span class="status-icon">🔗</span><span class="status-text">請開啟 YouTube 影片頁面</span>';
                break;

            case 'loading':
                statusMessage.innerHTML = '<span class="status-icon">⏳</span><span class="status-text">載入中...</span>';
                break;

            case 'error':
                statusMessage.innerHTML = '<span class="status-icon">❌</span><span class="status-text">發生錯誤</span>';
                statusMessage.classList.add('error');
                break;

            default:
                statusMessage.innerHTML = '<span class="status-icon">⏳</span><span class="status-text">檢查中...</span>';
        }
    }

    /**
     * 綁定事件
     */
    function bindEvents() {
        // 啟用/停用切換
        elements.enableToggle.addEventListener('change', handleToggleChange);

        // 檔案上傳
        elements.subtitleFile.addEventListener('change', handleFileUpload);

        // 字型選擇
        elements.fontSelector.addEventListener('change', handleSettingChange);

        // 字體大小
        elements.fontSizeSlider.addEventListener('input', handleFontSizeChange);

        // 顏色選擇
        elements.highlightColor.addEventListener('input', handleSettingChange);
        elements.shadowColor.addEventListener('input', handleSettingChange);

        // 時間偏移
        elements.timeOffset.addEventListener('input', handleTimeOffsetChange);

        // 開啟設定頁
        elements.openOptions.addEventListener('click', handleOpenOptions);

        // 監聽來自 content script 的訊息
        chrome.runtime.onMessage.addListener(handleMessage);
    }

    /**
     * 處理啟用/停用切換
     */
    async function handleToggleChange() {
        const enabled = elements.enableToggle.checked;

        try {
            await chrome.storage.sync.set({ enabled });

            // 通知 content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && tab.url.includes('youtube.com')) {
                chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SUBTITLES', enabled });
            }
        } catch (error) {
            console.error('Failed to toggle:', error);
        }
    }

    /**
     * 處理檔案上傳
     */
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const uploadStatus = elements.uploadStatus;
        uploadStatus.classList.remove('hidden', 'success', 'error');

        try {
            const text = await readFile(file);
            const parsed = parseSubtitleFile(text);

            if (parsed.error) {
                uploadStatus.textContent = `❌ ${parsed.error}`;
                uploadStatus.classList.add('error');
                return;
            }

            // 儲存字幕
            await saveSubtitle(parsed);

            uploadStatus.textContent = `✅ 已儲存：${parsed.title}`;
            uploadStatus.classList.add('success');

            // 通知 content script 載入字幕
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && tab.url.includes('youtube.com')) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'LOAD_SUBTITLE',
                    subtitleData: parsed
                });
            }

            // 更新狀態
            setTimeout(() => {
                getCurrentStatus();
            }, 500);

        } catch (error) {
            console.error('Failed to upload file:', error);
            uploadStatus.textContent = '❌ 上傳失敗';
            uploadStatus.classList.add('error');
        }

        // 清除檔案輸入
        event.target.value = '';
    }

    /**
     * 讀取檔案
     */
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('無法讀取檔案'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * 解析字幕檔案
     */
    function parseSubtitleFile(text) {
        if (!text || typeof text !== 'string') {
            return { error: '字幕檔案內容為空' };
        }

        const lines = text.split('\n').filter(line => line.trim() !== '');

        if (lines.length < 3) {
            return { error: '字幕檔案格式錯誤' };
        }

        const title = lines[0].trim();
        const videoUrl = lines[1].trim();
        const subtitleLines = lines.slice(2);

        // 提取影片 ID
        const videoIdMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/)([^#\&\?]{11})/);
        if (!videoIdMatch) {
            return { error: '無法從字幕檔案中提取 YouTube 影片 ID' };
        }
        const videoId = videoIdMatch[1];

        const subtitleData = [];
        let previousEndTime = 0;
        let previousLine = 0;
        const regex = /Line (\d+) \| Word (\d+) \| (\d{2}):(\d{2}):(\d{2}) → (\d{2}):(\d{2}):(\d{2}) \| (.+)/;

        subtitleLines.forEach((line, index) => {
            const match = line.match(regex);
            if (!match) return;

            const lineNumber = parseInt(match[1], 10);
            let wordIndex = parseInt(match[2], 10);
            const startTime = timeToSeconds(`${match[3]}:${match[4]}:${match[5]}`);
            const endTime = timeToSeconds(`${match[6]}:${match[7]}:${match[8]}`);
            const word = match[9].replace(/ /g, '␣').replace(/　/g, '␣␣');

            // 插入緩衝圓點
            const isNewLine = lineNumber !== previousLine;
            const hasLongGap = startTime - previousEndTime > 4;
            const isFirstEntryWithDelay = index === 0 && startTime >= 4;

            if ((isNewLine && hasLongGap) || isFirstEntryWithDelay) {
                const circleStartTime = Math.max(startTime - 3, 0);
                subtitleData.push({
                    line: lineNumber,
                    wordIndex: 1,
                    startTime: circleStartTime,
                    endTime: startTime,
                    word: '•••'
                });
                subtitleData.push({
                    line: lineNumber,
                    wordIndex: 2,
                    startTime: startTime,
                    endTime: startTime,
                    word: '&nbsp;'
                });
                wordIndex += 2;
            }

            subtitleData.push({
                line: lineNumber,
                wordIndex: wordIndex,
                startTime: startTime,
                endTime: endTime,
                word: word
            });

            previousEndTime = endTime;
            previousLine = lineNumber;
        });

        if (subtitleData.length === 0) {
            return { error: '無法解析任何字幕內容' };
        }

        return {
            videoId,
            title,
            url: videoUrl,
            data: subtitleData
        };
    }

    /**
     * 時間轉換
     */
    function timeToSeconds(timeStr) {
        const [min, sec, ms] = timeStr.split(':').map(parseFloat);
        return min * 60 + sec + (ms / 100);
    }

    /**
     * 儲存字幕
     */
    async function saveSubtitle(parsed) {
        const entry = {
            videoId: parsed.videoId,
            title: parsed.title,
            url: parsed.url,
            uploadedAt: Date.now(),
            data: parsed.data
        };

        // 儲存字幕資料
        await chrome.storage.local.set({ [`subtitle_${parsed.videoId}`]: entry });

        // 更新索引
        const result = await chrome.storage.local.get('subtitleIndex');
        const index = result.subtitleIndex || [];

        const existingIdx = index.findIndex(item => item.videoId === parsed.videoId);
        const indexEntry = {
            videoId: parsed.videoId,
            title: parsed.title,
            uploadedAt: Date.now()
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
     * 處理設定變更
     */
    async function handleSettingChange() {
        const settings = {
            font: elements.fontSelector.value,
            fontSize: parseInt(elements.fontSizeSlider.value, 10),
            highlightColor: elements.highlightColor.value,
            shadowColor: elements.shadowColor.value,
            timeOffset: parseInt(elements.timeOffset.value, 10) / 100
        };

        try {
            await chrome.storage.sync.set({ settings });

            // 通知 content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && tab.url.includes('youtube.com')) {
                chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', settings });
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * 處理字體大小變更
     */
    function handleFontSizeChange() {
        elements.fontSizeValue.textContent = `${elements.fontSizeSlider.value}px`;
        handleSettingChange();
    }

    /**
     * 處理時間偏移變更
     */
    function handleTimeOffsetChange() {
        const value = parseInt(elements.timeOffset.value, 10) / 100;
        elements.timeOffsetValue.textContent = `${value.toFixed(2)}s`;
        handleSettingChange();
    }

    /**
     * 開啟設定頁
     */
    function handleOpenOptions(event) {
        event.preventDefault();
        chrome.runtime.openOptionsPage();
    }

    /**
     * 處理來自 content script 的訊息
     */
    function handleMessage(message) {
        if (message.type === 'VIDEO_STATUS') {
            currentStatus = {
                videoId: message.videoId,
                hasSubtitle: message.hasSubtitle,
                title: message.title
            };

            if (message.hasSubtitle) {
                updateStatusDisplay('has-subtitle', message.title);
            } else {
                updateStatusDisplay('no-subtitle');
            }
        }
    }

    // 初始化
    init();
})();

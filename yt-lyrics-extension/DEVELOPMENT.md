# YouTube KTV Lyrics Extension 開發追蹤

## 專案資訊

- **專案名稱**: YouTube KTV Lyrics
- **類型**: Chrome Extension (Manifest V3)
- **開始日期**: 2026-01-09
- **狀態**: ✅ 初版完成

---

## 需求清單

### 核心需求

| # | 需求 | 優先級 | 狀態 |
|---|------|--------|------|
| 1 | 在 YouTube 影片上顯示 KTV 歌詞覆蓋層 | P0 | ✅ 完成 |
| 2 | 依 Video ID 自動配對歌詞檔案 | P0 | ✅ 完成 |
| 3 | 支援 YouTube 原生全螢幕模式 | P0 | ✅ 完成 |
| 4 | 歌詞儲存在 Chrome Extension Storage | P0 | ✅ 完成 |

### 歌詞顯示功能

| # | 需求 | 優先級 | 狀態 |
|---|------|--------|------|
| 5 | 雙行同步顯示（奇數行上、偶數行下） | P0 | ✅ 完成 |
| 6 | 逐字高亮動畫（左至右 clip-path） | P0 | ✅ 完成 |
| 7 | 影片底部 5-10% 位置顯示 | P1 | ✅ 完成 |
| 8 | 靜音段落顯示緩衝圓點 (●●●) | P2 | ✅ 完成 |

### Popup 功能

| # | 需求 | 優先級 | 狀態 |
|---|------|--------|------|
| 9 | 字幕開關切換 | P0 | ✅ 完成 |
| 10 | 顯示當前影片匹配狀態 | P0 | ✅ 完成 |
| 11 | 上傳新歌詞檔案 | P0 | ✅ 完成 |
| 12 | 字型選擇器（30+ 種字型） | P1 | ✅ 完成 |
| 13 | 字體大小調整（20-80px） | P1 | ✅ 完成 |
| 14 | 高亮顏色選擇 | P1 | ✅ 完成 |
| 15 | 陰影顏色選擇 | P1 | ✅ 完成 |
| 16 | 時間偏移調整（-1s ~ +1s） | P1 | ✅ 完成 |

### 歌詞庫管理

| # | 需求 | 優先級 | 狀態 |
|---|------|--------|------|
| 17 | 瀏覽已儲存的歌詞清單 | P1 | ✅ 完成 |
| 18 | 刪除單一歌詞 | P1 | ✅ 完成 |
| 19 | 搜尋/篩選功能 | P2 | ✅ 完成 |
| 20 | 顯示儲存空間使用量 | P2 | ✅ 完成 |

### 技術需求

| # | 需求 | 優先級 | 狀態 |
|---|------|--------|------|
| 21 | YouTube SPA 導航偵測 | P0 | ✅ 完成 |
| 22 | 影片時間同步（毫秒級） | P0 | ✅ 完成 |
| 23 | 廣告播放時隱藏字幕 | P2 | ✅ 完成 |
| 24 | 頁面不可見時暫停動畫 | P2 | ⬜ 待實作 |

---

## 開發進度

### 第一階段：基礎架構 ✅

- [x] 建立 manifest.json
- [x] 建立專案目錄結構
- [x] 實作 lib/subtitle-parser.js
- [x] 實作 lib/storage.js
- [x] 建立基本 content script 框架

### 第二階段：歌詞顯示引擎 ✅

- [x] 實作 content/lyrics-overlay.js
- [x] 移植雙行顯示演算法
- [x] 移植逐字動畫邏輯
- [x] 建立 content/content.css

### 第三階段：YouTube 整合 ✅

- [x] 實作 content/youtube-detector.js
- [x] 處理 yt-navigate-finish 事件
- [x] 處理全螢幕切換
- [x] 實作影片時間同步

### 第四階段：Popup UI ✅

- [x] 建立 popup/popup.html
- [x] 實作 popup/popup.js
- [x] 建立 popup/popup.css
- [x] 實作檔案上傳功能
- [x] 實作設定控制項

### 第五階段：Background Service Worker ✅

- [x] 實作 background/service-worker.js
- [x] 建立訊息路由
- [x] 實作儲存操作 API

### 第六階段：Options 頁面 ✅

- [x] 建立 options/options.html
- [x] 實作 options/options.js
- [x] 建立 options/options.css
- [x] 實作歌詞庫 CRUD

### 第七階段：字型整合 ✅

- [x] 複製 31 種字型檔案
- [x] 建立 fonts/fonts.css
- [x] 設定 web_accessible_resources

### 第八階段：測試與優化 🚧

- [x] 單元測試（55 個測試通過）
- [ ] 實際環境測試
- [ ] 全螢幕測試
- [ ] SPA 導航測試
- [ ] 效能優化

---

## 檔案結構

```
yt-lyrics-extension/
├── manifest.json                 ✅
├── DEVELOPMENT.md                ✅
├── package.json                  ✅
├── popup/
│   ├── popup.html               ✅
│   ├── popup.js                 ✅
│   └── popup.css                ✅
├── content/
│   ├── content.js               ✅
│   ├── lyrics-overlay.js        ✅
│   ├── youtube-detector.js      ✅
│   └── content.css              ✅
├── background/
│   └── service-worker.js        ✅
├── options/
│   ├── options.html             ✅
│   ├── options.js               ✅
│   └── options.css              ✅
├── lib/
│   ├── subtitle-parser.js       ✅
│   └── storage.js               ✅
├── fonts/                        ✅
│   ├── fonts.css                ✅
│   └── *.ttf / *.otf            ✅
├── icons/                        ✅
│   ├── icon16.png               ✅
│   ├── icon48.png               ✅
│   └── icon128.png              ✅
└── tests/
    ├── subtitle-parser.test.js  ✅
    └── lyrics-overlay.test.js   ✅
```

**圖例**: ✅ 完成 | 🚧 進行中 | ⬜ 待開發

---

## 移植來源對照

| 來源檔案 | 行數 | 內容 | 目標檔案 | 狀態 |
|---------|------|------|---------|------|
| player.js | 258-339 | 字幕檔案解析 | lib/subtitle-parser.js | ✅ |
| player.js | 342-345 | 時間轉換函式 | lib/subtitle-parser.js | ✅ |
| player.js | 418-543 | 雙行顯示演算法 | content/lyrics-overlay.js | ✅ |
| player.js | 474-514 | 逐字動畫邏輯 | content/lyrics-overlay.js | ✅ |
| player.css | 442-471 | 文字動畫樣式 | content/content.css | ✅ |
| player.css | 137-253 | @font-face 宣告 | fonts/fonts.css | ✅ |
| fonts/* | - | 31 種字型 | fonts/ | ✅ |

---

## 技術規格

### 儲存結構

```javascript
// chrome.storage.sync (跨裝置同步)
{
    "settings": {
        "font": "NotoSans",
        "fontSize": 40,
        "highlightColor": "#80D9E5",
        "shadowColor": "#1D1B1B",
        "timeOffset": 0
    },
    "enabled": true
}

// chrome.storage.local (本地儲存)
{
    "subtitle_VIDEO_ID": {
        "videoId": "...",
        "title": "歌曲名稱",
        "uploadedAt": 1704844800000,
        "data": [/* 字幕資料 */]
    },
    "subtitleIndex": [/* 快速索引 */]
}
```

### 訊息類型

```javascript
// Popup -> Content Script
{ type: 'TOGGLE_SUBTITLES', enabled: boolean }
{ type: 'UPDATE_SETTINGS', settings: {...} }
{ type: 'LOAD_SUBTITLE', videoId: string, subtitleData: array }

// Content Script -> Popup
{ type: 'VIDEO_STATUS', videoId: string, hasSubtitle: boolean }
```

---

## 安裝方式

1. 開啟 Chrome 瀏覽器
2. 前往 `chrome://extensions/`
3. 開啟右上角的「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 `yt-lyrics-extension` 資料夾

---

## 變更記錄

| 日期 | 版本 | 變更內容 |
|------|------|----------|
| 2026-01-09 | - | 建立開發追蹤文件 |
| 2026-01-09 | 1.0.0 | 完成初版開發 |

---

## 備註

- 優先級說明：P0 = 必要功能、P1 = 重要功能、P2 = 次要功能
- 測試執行：`npm test`
- 圖示檔案目前為佔位符，需替換為正式圖示

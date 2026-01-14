# Development Principal

- 所有的功能開發都必須要先寫測試再開發，遵循 TDD 架構

## 每個功能完成前確認

□ 有對應的 integration test
□ 測試覆蓋 happy path + 至少一個 error path
□ 所有選擇器使用 role/label 優先
□ 非同步操作用 waitFor 包裝
□ API mock 使用 MSW
□ 測試可獨立執行 (npm test -- --run [file])
□ 無 console warnings/errors

```

---

## 推薦的專案結構
```

src/
├── features/
│ └── login/
│ ├── LoginForm.tsx
│ ├── LoginForm.test.tsx # unit test
│ └── login.integration.test.ts # integration test
├── mocks/
│ ├── handlers.ts # MSW handlers
│ └── server.ts
└── test/
└── setup.ts # global test setup

## Integration Test Guidelines

### 選擇器優先順序（由高到低）

1. `getByRole` — 最接近使用者認知 (button, textbox, heading)
2. `getByLabelText` — 表單元素
3. `getByPlaceholderText` — 次選
4. `getByText` — 可見文字
5. `getByTestId` — 最後手段，需加 data-testid

### 禁止使用

- class name 或 id 選擇器
- component 內部 state 斷言
- implementation-specific selectors (如 `.MuiButton-root`)
- 固定的 setTimeout/sleep

### 必須使用

- `waitFor` 或 `findBy*` 處理非同步
- `userEvent` 而非 `fireEvent`（更接近真實行為）
- 明確的 accessibility role

### 測試結構

describe('[Feature Name]', () => {
beforeEach(() => {
// 統一的 setup: mock API, render app
});

it('should [expected behavior] when [user action]', async () => {
// Arrange: 準備測試資料
// Act: 執行使用者操作
// Assert: 驗證結果
});
});

### Mock 策略

- API calls: 使用 MSW (Mock Service Worker)
- 時間相關: 使用 vi.useFakeTimers()
- 外部服務: 在 test setup 統一 mock

### 命名規範

- 檔案: `[feature].integration.test.ts`
- 描述: "should [動詞] when [條件]"

## Shared Modules

字幕解析相關邏輯必須使用共用模組，避免重複實作導致不一致：

### SubtitleParser

**檔案位置：**

- Extension: `yt-lyrics-extension/lib/subtitle-parser.js`
- HTML Player/Maker: `yt-lyrics-html/lib/subtitle-parser.js` (複製自 extension)

**提供的功能：**

- `parseSubtitleFile(text)` - 解析完整字幕檔案
- `parseSubtitleLine(line)` - 解析單行字幕
- `timeToSeconds(timeStr)` - 時間字串轉秒數
- `extractVideoId(url)` - 從 YouTube URL 提取影片 ID
- `validateSubtitleFile(text)` - 驗證字幕檔案格式
- `ROLE_COLORS` - 角色顏色配置常數
- `_SUBTITLE_LINE_REGEX` - 字幕行解析正則表達式
- `_YOUTUBE_URL_REGEX` - YouTube URL 解析正則表達式

**使用方式：**

```html
<!-- Extension popup -->
<script src="../lib/subtitle-parser.js"></script>

<!-- HTML Player/Maker -->
<script src="lib/subtitle-parser.js"></script>
```

```javascript
// 解析字幕
const result = SubtitleParser.parseSubtitleFile(text);

// 提取影片 ID
const videoId = SubtitleParser.extractVideoId(url);

// 時間轉換
const seconds = SubtitleParser.timeToSeconds("01:23:45");

// 角色顏色
const colors = SubtitleParser.ROLE_COLORS; // {'1': '#FF6B9D', '2': '#98FB98', '3': '#FFD700'}
```

**重要：** 修改 `subtitle-parser.js` 後，需同步更新 `yt-lyrics-html/lib/` 的副本！

## Codebase Structure

### 專案架構總覽

專案由兩個核心組件組成：

1. **yt-lyrics-extension/** - Chrome Extension (Manifest V3)
2. **yt-lyrics-html/** - 獨立網頁工具 (Maker + Player)
3. **samples/** - 範例字幕檔案
4. **文檔檔案** - README.md, ROADMAP.md, INSTALL.md

### Chrome Extension (yt-lyrics-extension/)

#### 核心架構

**背景服務 (Background)**

- `background/service-worker.js` (5.8 KB) - 訊息路由、Chrome Storage API 協調

**內容腳本 (Content Scripts)**

- `content/content.js` (8.4 KB) - 主要內容腳本，初始化字幕系統
- `content/lyrics-overlay.js` (16 KB) - 字幕渲染引擎，使用 clip-path 動畫
- `content/youtube-detector.js` (9.0 KB) - 偵測 YouTube SPA 導航變化
- `content/content.css` (4.3 KB) - 字幕疊加層樣式

**彈出視窗 (Popup)**

- `popup/popup.html` (5.8 KB) - 擴充功能彈出介面
- `popup/popup.js` (15 KB) - 設定 UI、檔案上傳、字型/顏色選擇
- `popup/popup.css` (6.1 KB) - 彈出視窗樣式

**選項頁面 (Options)**

- `options/options.html` - 設定頁面
- `options/options.js` - 字幕庫管理（CRUD 操作）
- `options/options.css` - 設定頁面樣式

**共用函式庫 (Library)**

- `lib/subtitle-parser.js` (7.6 KB) - 字幕解析模組（主副本）
- `lib/storage.js` (9.7 KB) - Chrome Storage 包裝層

**資源檔案**

- `fonts/` - 30+ 多語言字型檔案 (TTF/OTF)
- `icons/` - 擴充功能圖示 (16px, 48px, 128px, SVG)

**測試檔案**

- `tests/subtitle-parser.test.js` - 解析器單元測試
- `tests/lyrics-overlay.test.js` - 渲染引擎測試
- 總共 55 個測試通過

**配置檔案**

- `manifest.json` - Manifest V3 配置
- `package.json` - Jest 測試配置

#### 資料流程

```
Popup UI (使用者上傳字幕)
    ↓ (chrome.runtime.sendMessage)
Service Worker (訊息路由)
    ↓ (chrome.storage.local.set)
Content Script (接收訊息)
    ↓ (初始化 LyricsOverlay)
Lyrics Overlay Engine
    ↓ (監聽 video.currentTime)
    ↓ (requestAnimationFrame 同步)
    → 在 YouTube 上渲染 KTV 字幕
```

### 網頁工具 (yt-lyrics-html/)

#### 核心檔案

**Maker (字幕製作工具)**

- `maker.html` (5.0 KB) - 字幕創建介面
- `maker.js` (31 KB) - 字幕編輯器邏輯，智能解析多語言文字
- `maker.css` (17 KB) - Maker 樣式與動畫

**Player (字幕播放器)**

- `player.html` (7.2 KB) - 字幕播放介面
- `player.js` (21 KB) - 播放引擎，動畫邏輯
- `player.css` (13 KB) - Player 樣式，KTV 動畫效果

**共用資源**

- `lib/subtitle-parser.js` - 字幕解析模組（副本，需與 extension 同步）
- `fonts/` - 30+ 字型檔案（與 extension 相同）

#### 工作流程

```
maker.html/maker.js
    ↓ (YouTube IFrame API)
    ↓ (使用者輸入 + 時間戳記)
    ↓ (匯出)
  .txt 檔案（字幕格式）
    ↓ (上傳)
player.html/player.js
    ↓ (解析檔案)
    ↓ (提取影片 ID & 同步)
    → 渲染 KTV 風格動畫字幕
```

### 關鍵技術特點

**動畫系統**

- 使用 CSS `clip-path: inset()` 實現逐字填充效果
- `requestAnimationFrame` 精準同步影片時間軸
- 毫秒級精度 (MM:SS:MS 格式)

**多語言支援**

- 智能解析：中文、日文、韓文、英文
- 30+ 字型選擇，支援多種書寫系統
- 注音支援（選用）

**儲存架構**

- Chrome sync storage: 使用者設定
- Chrome local storage: 字幕檔案內容
- 空間使用追蹤與管理

**擴充功能整合**

- Manifest V3 合規
- YouTube SPA 導航偵測
- 訊息傳遞架構 (popup ↔ service-worker ↔ content)

### 檔案數量統計

| 類別               | 數量      | 說明                                        |
| ------------------ | --------- | ------------------------------------------- |
| JavaScript         | 13 個     | 內容腳本、彈出視窗、選項、服務 worker、測試 |
| HTML               | 4 個      | Maker、Player、Options、測試檔案            |
| CSS                | 5 個      | Maker、Player、Options、Fonts、Content      |
| 字型檔案           | 30+       | TTF/OTF 格式                                |
| **程式碼檔案總計** | **27 個** | (不含 node_modules)                         |

### 字幕檔案格式

```
[歌曲標題]
https://www.youtube.com/watch?v=VIDEOID

Line 1 | Word 1 | 00:05:23 → 00:05:50 | 昨
Line 1 | Word 2 | 00:05:50 → 00:06:10 | 天
Line 1 | Word 3 | 00:06:10 → 00:06:45 | 的
...
```

時間格式：`MM:SS:MS` (分:秒:百分之一秒)

### 開發狀態

**Extension**: ✅ 核心版本 1.0.0 完成

- 55 個單元測試通過
- 8 個開發階段完成
- Manifest V3 合規

**HTML Tools**: ✅ 完全功能

- Maker 支援注音
- Player 完整客製化

**待完成項目**:

- 全螢幕實際環境測試
- 頁面可見性優化（分頁隱藏時暫停動畫）
- 視覺美化

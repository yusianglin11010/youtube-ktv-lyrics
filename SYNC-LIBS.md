# 共用程式庫同步機制

## 背景說明

本專案包含兩個應用:
- **yt-lyrics-html/** - 獨立網頁版 (製作器 + 播放器)
- **yt-lyrics-extension/** - Chrome 擴充功能

兩者需要共用以下程式庫:
- `lib/subtitle-parser.js` - 字幕解析器
- `lib/constants.js` - 常數定義
- `lib/animation-utils.js` - 動畫工具
- `lib/font-size-calculator.js` - 字體大小計算

## 設計原則

### 單一來源原則 (Single Source of Truth)

- **主來源**: `yt-lyrics-html/lib/`
- **同步目標**: `yt-lyrics-extension/lib/`

所有共用檔案的修改都必須在 `yt-lyrics-html/lib/` 進行,然後透過 `sync-libs.js` 同步到 extension。

## 使用方式

### 修改共用檔案

```bash
# 1. 編輯主來源檔案
vim yt-lyrics-html/lib/subtitle-parser.js

# 2. 執行同步腳本
npm run sync-libs

# 3. 確認同步結果
git diff yt-lyrics-extension/lib/
```

### 檢查同步狀態

```bash
# 手動執行同步 (會顯示哪些檔案被更新)
npm run sync-libs

# 或直接執行腳本
node sync-libs.js
```

### 自動同步時機

本專案設定了以下自動同步時機:

1. **npm install** - 透過 `prepare` hook 自動執行
2. **npm run build** - build 流程會先執行 sync-libs

## 同步腳本功能

### 智慧檔案比對

`sync-libs.js` 會自動:
- 比對來源檔案和目標檔案的內容
- 只在實際內容有差異時才覆寫
- 自動在目標檔案頂部加入警告註解

### 警告註解

所有同步產生的檔案都會在開頭加入:

```javascript
// ⚠️ AUTO-SYNCED from yt-lyrics-html/lib - DO NOT EDIT DIRECTLY
// To modify this file, edit yt-lyrics-html/lib/[filename] and run: npm run sync-libs
```

這個註解會:
- 提醒開發者不要直接編輯 extension 版本
- 說明正確的修改流程
- 在同步比對時會自動被忽略 (避免誤判差異)

### 執行輸出範例

```bash
$ npm run sync-libs

🔄 Starting library sync...

Source: /Users/.../yt-lyrics-html/lib
Target: /Users/.../yt-lyrics-extension/lib

⏭️  subtitle-parser.js - already in sync
✅ constants.js - synced successfully
⏭️  animation-utils.js - already in sync
⏭️  font-size-calculator.js - already in sync

==================================================
✨ Sync completed: 4 synced, 0 errors
```

## 注意事項

### ❌ 不要做的事

- **不要**直接編輯 `yt-lyrics-extension/lib/` 中的共用檔案
- **不要**手動複製檔案 (使用 `npm run sync-libs` 自動化)
- **不要**刪除同步腳本加入的警告註解

### ✅ 正確做法

- **一律**修改 `yt-lyrics-html/lib/` 中的檔案
- **一律**使用 `npm run sync-libs` 進行同步
- **提交前**確認兩邊檔案已同步 (`git status` 應該看到兩邊都有變更)
- **確認**extension 版本的檔案開頭有警告註解

## 技術細節

### 為什麼不用 symlink?

考慮過使用符號連結 (symlink),但有以下問題:
- Windows 支援度差
- Git 處理 symlink 很複雜
- 跨環境 (不同電腦、CI/CD) 會有問題

### 為什麼不靠人工記憶?

在 AGENTS.md 寫規範讓 AI agent 遵守,但有以下風險:
- Agent 可能疏忽
- 人類開發者可能忘記
- 無法強制執行

### Build Script 的優勢

- ✅ 跨平台相容 (Node.js)
- ✅ 自動化,不會忘記
- ✅ 可整合 git hooks / CI/CD
- ✅ 智慧檔案比對,避免不必要的覆寫
- ✅ 清楚的視覺化輸出

## 故障排除

### 檔案不同步

```bash
# 強制重新同步所有檔案
rm -f yt-lyrics-extension/lib/subtitle-parser.js \
      yt-lyrics-extension/lib/constants.js \
      yt-lyrics-extension/lib/animation-utils.js \
      yt-lyrics-extension/lib/font-size-calculator.js
npm run sync-libs
```

### 檢查檔案差異

```bash
# 比對兩個版本的差異 (會忽略警告註解)
diff <(tail -n +4 yt-lyrics-extension/lib/constants.js) \
     yt-lyrics-html/lib/constants.js
```

## 參考資料

- 同步腳本: [sync-libs.js](sync-libs.js)
- 開發規範: [AGENTS.md](AGENTS.md#共用程式庫同步規範)
- NPM Scripts: [package.json](package.json)

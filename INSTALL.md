# YouTube KTV Lyrics Extension 安裝說明

## 📦 檔案說明

- **yt-lyrics-extension.tar.gz**: Extension 壓縮檔（82MB，包含 31 種字型）
- 解壓後可直接在 Chrome 載入

---

## 🚀 安裝步驟

### 1. 下載並解壓縮

在有瀏覽器的電腦上：

```bash
# 下載 yt-lyrics-extension.tar.gz 到你的電腦
# 然後解壓縮
tar -xzf yt-lyrics-extension.tar.gz
```

或者在 Windows：
- 右鍵點擊檔案
- 選擇「全部解壓縮」

### 2. 載入到 Chrome

1. **開啟 Chrome 瀏覽器**

2. **進入擴充功能頁面**
   - 在網址列輸入：`chrome://extensions/`
   - 或點擊右上角 ⋮ → 更多工具 → 擴充功能

3. **開啟開發人員模式**
   - 右上角的「開發人員模式」開關，切換到開啟

4. **載入 Extension**
   - 點擊「載入未封裝項目」
   - 選擇解壓縮後的 `yt-lyrics-extension` 資料夾
   - 點擊「選擇資料夾」

5. **確認安裝成功**
   - Extension 應該出現在清單中
   - Chrome 工具列應該出現 Extension 圖示

---

## ✅ 快速測試

### 步驟 1：開啟測試影片

在 Chrome 開啟：
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### 步驟 2：上傳字幕

1. 點擊 Chrome 工具列的 Extension 圖示
2. 點擊「📁 上傳字幕檔案」
3. 選擇 `test-subtitle.txt`（在 yt-lyrics-extension 目錄內）

### 步驟 3：播放影片

- 播放影片，應該會在底部看到字幕
- 字幕會逐字高亮顯示（由左至右）

### 步驟 4：測試功能

- **調整設定**：字型、大小、顏色
- **全螢幕**：按 `F` 鍵，字幕應該仍然顯示
- **開關字幕**：用 Popup 的切換開關

---

## 📂 檔案結構

解壓後的資料夾包含：

```
yt-lyrics-extension/
├── manifest.json           # Extension 設定
├── test-subtitle.txt       # 測試用字幕檔案
├── QUICKSTART.md          # 5分鐘快速測試指南
├── TESTING.md             # 完整測試指南
├── popup/                 # Popup UI
├── content/               # 字幕顯示邏輯
├── background/            # Background worker
├── options/               # 歌詞庫管理頁面
├── lib/                   # 共用模組
├── fonts/                 # 31 種字型（佔大部分空間）
└── icons/                 # 圖示
```

---

## 🎤 使用方式

### 製作自己的字幕

1. **使用 Maker 工具**
   - 開啟 `yt-lyrics-html/maker.html`（在另一個資料夾）
   - 輸入 YouTube 影片網址
   - 輸入歌詞並錄製時間軸
   - 下載字幕檔案

2. **在 YouTube 上傳字幕**
   - 開啟對應的 YouTube 影片
   - 點擊 Extension 圖示
   - 上傳剛才製作的字幕檔案

3. **播放並享受 KTV 字幕**
   - 字幕會自動同步顯示

### 管理歌詞庫

1. **開啟管理頁面**
   - Popup 底部點擊「管理歌詞庫」
   - 或在 `chrome://extensions/` 點擊 Extension 的「選項」

2. **功能**
   - 瀏覽所有已儲存的歌詞
   - 搜尋歌曲
   - 刪除歌曲
   - 查看儲存空間使用量

---

## 🔧 常見問題

### Q: 字幕沒有顯示？

**檢查清單**：
1. ✅ 確認已上傳字幕檔案（Popup 顯示「已載入字幕」）
2. ✅ Popup 中的開關是開啟狀態
3. ✅ 影片已經開始播放
4. ✅ 按 F12 查看 Console 是否有錯誤

### Q: 字幕不同步？

**解決方法**：
- 在 Popup 中調整「時間偏移」滑桿
- 向右移動 = 字幕延遲
- 向左移動 = 字幕提前

### Q: 字幕被遮擋？

**解決方法**：
- 目前字幕固定在影片底部 8%
- 可以調整字體大小
- 或暫時退出全螢幕

### Q: Extension 無法載入？

**解決方法**：
1. 確認已開啟「開發人員模式」
2. 確認選擇的是正確的資料夾（包含 manifest.json）
3. 查看 `chrome://extensions/` 是否顯示錯誤訊息
4. 嘗試重新載入 Extension

---

## 📝 系統需求

- **瀏覽器**：Chrome 88+ 或 Edge 88+
- **作業系統**：Windows / macOS / Linux
- **磁碟空間**：約 85MB（包含字型）
- **YouTube**：需要在 youtube.com/watch 頁面使用

---

## 🐛 除錯

### 查看 Console 訊息

1. 在 YouTube 頁面按 **F12**
2. 切換到 **Console** 分頁
3. 尋找 `[YT-KTV]` 開頭的訊息

正常訊息範例：
```
[YT-KTV] Extension initialized
[YT-KTV] Video changed: dQw4w9WgXcQ
[YT-KTV] Subtitle loaded: 測試歌曲
```

### 查看儲存資料

1. 按 **F12** → **Application** 分頁
2. 左側選單：**Storage** → **Extension Storage**
3. 查看 `settings` 和 `subtitle_*` 資料

---

## 📚 更多資訊

- **快速開始**：查看 `QUICKSTART.md`（5 分鐘快速測試）
- **完整測試**：查看 `TESTING.md`（詳細測試指南）
- **開發文檔**：查看 `DEVELOPMENT.md`（技術細節）

---

## 📧 回報問題

如果遇到問題，請提供：
1. Chrome 版本
2. Console 錯誤訊息
3. 重現步驟
4. 影片 URL

---

## 🎉 享受 KTV 體驗！

安裝完成後，你可以：
- 為任何 YouTube 影片添加字幕
- 自訂字型、顏色、大小
- 在全螢幕模式享受 KTV 體驗
- 管理你的歌詞庫

Have fun! 🎤🎵

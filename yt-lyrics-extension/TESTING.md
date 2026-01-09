# YouTube KTV Lyrics Extension 測試指南

## 安裝 Extension

### 1. 載入到 Chrome

1. 開啟 Chrome 瀏覽器
2. 在網址列輸入 `chrome://extensions/` 並按 Enter
3. 在右上角開啟「開發人員模式」（Developer mode）
4. 點擊「載入未封裝項目」（Load unpacked）
5. 選擇 `/home/devin/yt-lyrics-maker/yt-lyrics-extension` 資料夾
6. 確認擴充功能已成功載入

### 2. 驗證安裝

- 在 Chrome 工具列應該會看到 Extension 圖示
- 點擊圖示應該會開啟 Popup 視窗

---

## 準備測試字幕檔案

### 使用現有的字幕檔案

如果你之前使用 `yt-lyrics-html/maker.html` 製作過字幕檔案，可以直接使用。

### 建立測試用字幕檔案

我已經為你建立了一個測試用的字幕檔案，位於：
`/home/devin/yt-lyrics-maker/yt-lyrics-extension/test-subtitle.txt`

---

## 測試步驟

### 測試 1：基本功能測試

1. **開啟 YouTube 影片**
   - 前往 https://www.youtube.com/watch?v=dQw4w9WgXcQ
   - 或任何你有字幕檔案的 YouTube 影片

2. **上傳字幕檔案**
   - 點擊 Chrome 工具列的 Extension 圖示
   - 在 Popup 中點擊「上傳字幕檔案」
   - 選擇字幕檔案（.txt 格式）
   - 確認顯示「已儲存」訊息

3. **檢查字幕顯示**
   - 播放影片
   - 應該會在影片底部看到字幕覆蓋層
   - 字幕應該會逐字高亮顯示（由左至右）

### 測試 2：設定調整

1. **字型變更**
   - 在 Popup 中選擇不同的字型
   - 字幕字型應該立即改變

2. **字體大小**
   - 調整大小滑桿（20-80px）
   - 字幕大小應該立即改變

3. **顏色調整**
   - 調整高亮顏色和陰影顏色
   - 字幕顏色應該立即改變

4. **時間偏移**
   - 調整時間偏移滑桿
   - 字幕時間應該向前或向後偏移

### 測試 3：全螢幕模式

1. **進入全螢幕**
   - 點擊 YouTube 播放器的全螢幕按鈕
   - 或按 `F` 鍵

2. **驗證字幕顯示**
   - 字幕應該仍然顯示在影片底部
   - 字幕應該保持同步

3. **退出全螢幕**
   - 按 `Esc` 或點擊退出按鈕
   - 字幕應該正常顯示

### 測試 4：字幕開關

1. **關閉字幕**
   - 在 Popup 中關閉字幕開關
   - 字幕應該立即消失

2. **開啟字幕**
   - 在 Popup 中開啟字幕開關
   - 字幕應該立即出現

### 測試 5：影片切換

1. **切換到另一支影片**
   - 點擊其他 YouTube 影片
   - 如果有對應字幕，應該自動載入
   - 如果沒有字幕，Popup 應該顯示「此影片尚無字幕」

2. **回到原本的影片**
   - 字幕應該自動恢復

### 測試 6：歌詞庫管理

1. **開啟管理頁面**
   - 在 Popup 底部點擊「管理歌詞庫」
   - 或直接在 Chrome Extensions 頁面點擊「選項」

2. **查看歌詞清單**
   - 應該顯示所有已儲存的歌詞
   - 顯示歌曲標題、影片 ID、上傳日期

3. **搜尋功能**
   - 在搜尋框輸入關鍵字
   - 應該過濾符合的歌曲

4. **刪除功能**
   - 點擊某首歌的「刪除」按鈕
   - 確認刪除後，該歌曲應該從列表中消失

---

## 常見問題排查

### 字幕沒有顯示

1. **檢查是否已上傳字幕**
   - 開啟 Popup，確認顯示「已載入字幕」

2. **檢查字幕是否啟用**
   - 確認 Popup 中的開關是開啟狀態

3. **檢查 Console**
   - 按 F12 開啟開發者工具
   - 查看 Console 是否有錯誤訊息

### 字幕不同步

1. **調整時間偏移**
   - 在 Popup 中調整時間偏移滑桿
   - 向右移動 = 字幕延遲
   - 向左移動 = 字幕提前

### Extension 無法載入

1. **檢查 Manifest 錯誤**
   - 在 `chrome://extensions/` 查看是否有錯誤訊息

2. **重新載入 Extension**
   - 在 `chrome://extensions/` 點擊重新載入按鈕

---

## 開發者工具除錯

### 查看 Console 訊息

1. **Content Script Console**
   - 在 YouTube 頁面按 F12
   - 切換到 Console 分頁
   - 應該看到 `[YT-KTV]` 開頭的訊息

2. **Popup Console**
   - 在 Popup 視窗按右鍵 → 檢查
   - 查看 Popup 的 Console

3. **Background Console**
   - 在 `chrome://extensions/` 點擊「Service Worker」
   - 查看 Background 的 Console

### 查看儲存資料

1. **開啟 Application 分頁**
   - 在 YouTube 頁面按 F12
   - 切換到 Application 分頁

2. **查看 Extension Storage**
   - 左側選單：Storage → Extension Storage
   - 應該看到 `settings` 和 `subtitle_*` 資料

---

## 效能檢查

### 記憶體使用

1. 開啟 Chrome 工作管理員（Shift + Esc）
2. 找到 Extension 的記憶體使用量
3. 正常應該在 20-50 MB 之間

### CPU 使用

1. 播放影片時，CPU 使用率應該保持在合理範圍
2. 如果 CPU 使用率過高，可能需要優化動畫循環

---

## 回報問題

如果發現問題，請記錄：

1. **錯誤訊息**（從 Console）
2. **重現步驟**
3. **Chrome 版本**
4. **影片 URL**
5. **字幕檔案**（如果可以分享）

將問題回報到專案 Issues。

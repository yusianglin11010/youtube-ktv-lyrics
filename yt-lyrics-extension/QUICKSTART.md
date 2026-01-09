# 快速開始指南

## 5 分鐘快速測試

### 步驟 1：安裝 Extension（1 分鐘）

```bash
# 1. 開啟 Chrome 瀏覽器
# 2. 在網址列輸入並按 Enter
chrome://extensions/

# 3. 開啟右上角的「開發人員模式」開關
# 4. 點擊「載入未封裝項目」
# 5. 選擇這個資料夾：
/home/devin/yt-lyrics-maker/yt-lyrics-extension
```

**驗證**：Chrome 工具列應該會出現 Extension 圖示

---

### 步驟 2：開啟測試影片（30 秒）

在 Chrome 開啟這個連結：
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

這是 Rick Astley 的 "Never Gonna Give You Up"

---

### 步驟 3：上傳字幕（1 分鐘）

1. **點擊 Extension 圖示**
   - 應該會彈出 Popup 視窗

2. **點擊「上傳字幕檔案」按鈕**
   - 選擇檔案：`test-subtitle.txt`（在專案根目錄）

3. **確認上傳成功**
   - Popup 應該顯示「✅ 已儲存：測試歌曲 - Never Gonna Give You Up」
   - 狀態顯示「✅ 已載入字幕」

---

### 步驟 4：播放並觀看字幕（2 分鐘）

1. **播放影片**
   - 點擊 YouTube 播放按鈕

2. **觀察字幕**
   - 影片底部應該出現白色字幕
   - 字幕會逐字變色（由左至右）
   - 雙行顯示：奇數行在上、偶數行在下

3. **測試全螢幕**
   - 點擊全螢幕按鈕（或按 `F` 鍵）
   - 字幕應該仍然正常顯示

---

### 步驟 5：調整設定（1 分鐘）

回到 Popup，嘗試調整：

1. **字體大小**
   - 拉動滑桿，字幕會立即變大/變小

2. **高亮顏色**
   - 點擊顏色選擇器，改變字幕顏色

3. **字型**
   - 下拉選單選擇不同字型

4. **時間偏移**
   - 如果字幕不同步，調整時間偏移

---

## 進階測試

### 測試自己的歌詞

1. 使用 `yt-lyrics-html/maker.html` 製作字幕
2. 下載字幕檔案
3. 在對應的 YouTube 影片頁面上傳字幕

### 管理歌詞庫

1. **開啟管理頁面**
   - Popup 底部點擊「管理歌詞庫」

2. **查看所有歌詞**
   - 顯示已儲存的歌曲列表

3. **搜尋歌曲**
   - 在搜尋框輸入關鍵字

4. **刪除歌曲**
   - 點擊「刪除」按鈕

---

## 常見問題

### Q: 字幕沒有顯示？

**A: 檢查清單**
- ✅ 確認已上傳字幕檔案
- ✅ Popup 中的開關是開啟狀態
- ✅ 按 F12 查看 Console 是否有錯誤

### Q: 字幕不同步？

**A: 調整時間偏移**
- 在 Popup 中調整時間偏移滑桿
- 向右 = 字幕延遲
- 向左 = 字幕提前

### Q: 字幕被擋住？

**A: 調整字幕位置**
- 目前字幕固定在底部 8%
- 可以退出全螢幕查看

---

## 除錯

### 查看 Console 訊息

1. **在 YouTube 頁面按 F12**
2. **切換到 Console 分頁**
3. **尋找 `[YT-KTV]` 開頭的訊息**

範例訊息：
```
[YT-KTV] Extension initialized
[YT-KTV] Video changed: dQw4w9WgXcQ
[YT-KTV] Subtitle loaded: 測試歌曲
```

### 查看儲存資料

1. **按 F12 → Application 分頁**
2. **Storage → Extension Storage**
3. **查看 `settings` 和 `subtitle_*` 資料**

---

## 下一步

- 閱讀完整的 [測試指南](TESTING.md)
- 查看 [開發追蹤文件](DEVELOPMENT.md)
- 使用 Maker 工具製作更多字幕

---

## 需要幫助？

- 查看 Console 錯誤訊息
- 檢查 `chrome://extensions/` 是否有錯誤
- 重新載入 Extension

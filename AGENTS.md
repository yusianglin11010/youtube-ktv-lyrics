# Development Principal

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

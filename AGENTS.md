## Develop principles

- test page(not unit test or integration test) should put in /tmp folder

## 狀態管理規範

### 雙模式設計原則

本專案支援**主歌詞模式**和**拼音模式**兩種工作流程,任何操作時間戳記或工作流程狀態的函數都必須同時考慮這兩種模式。

**關鍵狀態變數** (定義於 `yt-lyrics-html/maker.js:10-31`):
- `MakerState.timestamps` - 主歌詞時間戳記
- `MakerState.pinyinTimestamps` - 拼音時間戳記
- `MakerState.pinyinToLyricMappings` - 拼音到歌詞的映射
- `MakerState.workflowPhase` - 工作流程階段 ('INPUT' | 'SYNC_PINYIN' | 'MAPPING' | 'COMPLETE')

### 修改狀態管理函數的檢查清單

在修改任何重置/重來/導航相關函數時,務必檢查以下項目:

#### ✅ 必須檢查的項目

1. **判斷當前模式**
   ```javascript
   let isPinyinMode = MakerState.workflowPhase === 'SYNC_PINYIN';
   ```

2. **清空正確的時間戳記陣列**
   ```javascript
   if (isPinyinMode) {
       MakerState.pinyinTimestamps = [...];
   } else {
       MakerState.timestamps = [...];
   }
   ```

3. **移除正確的 UI 高亮樣式**
   ```javascript
   if (isPinyinMode) {
       document.querySelectorAll('.pinyin-syllable').forEach(...);
   } else {
       document.querySelectorAll('.word').forEach(...);
   }
   ```

4. **呼叫正確的顯示更新函數**
   ```javascript
   if (isPinyinMode) {
       UIHandlers.displayPinyinSyncInterface();
       UIHandlers.updatePinyinTimestampsDisplay();
   } else {
       UIHandlers.displayLyrics();
       UIHandlers.updateTimestampsDisplay();
   }
   ```

5. **完整重置時需清空所有相關狀態**
   - `timestamps`
   - `pinyinTimestamps`
   - `pinyinToLyricMappings`
   - 重置 `workflowPhase` (根據 `pinyinEnabled` 決定)

### 常見陷阱與案例

#### ❌ 錯誤範例:只處理主歌詞模式

```javascript
function resetAll() {
    MakerState.timestamps = [];  // ❌ 忘記清空 pinyinTimestamps
    UIHandlers.displayLyrics();  // ❌ 拼音模式應該呼叫 displayPinyinSyncInterface
}
```

#### ✅ 正確範例:支援雙模式

```javascript
function resetAll() {
    // 清空所有時間戳記
    MakerState.timestamps = [];
    MakerState.pinyinTimestamps = [];
    MakerState.pinyinToLyricMappings = [];

    // 根據模式顯示
    if (MakerState.workflowPhase === 'SYNC_PINYIN') {
        UIHandlers.displayPinyinSyncInterface();
        UIHandlers.updatePinyinTimestampsDisplay();
    } else {
        UIHandlers.displayLyrics();
        UIHandlers.updateTimestampsDisplay();
    }
}
```

### 相關函數清單

以下函數必須遵守雙模式設計原則:
- `SyncRecorder.resetAll()` - 全部重來
- `SyncRecorder.restartCurrentLine()` - 本句重來
- `SyncRecorder.prevLine()` - 上一句
- `SyncRecorder.findFirstTimestampOfCurrentLine()` - 查找時間戳
- `SyncRecorder.findFirstTimestampOfLine()` - 查找時間戳

### 歷史問題記錄

**2026-01-16 修復**: 發現 `resetAll()`, `restartCurrentLine()`, `prevLine()` 三個函數只處理主歌詞模式,導致拼音模式下狀態不一致。修復方式:加入 `isPinyinMode` 判斷並處理兩種模式的狀態。詳見 commit 或 `/Users/yusiang/.claude/plans/replicated-sparking-turtle.md`

## Claude Code Skills

When performing frontend design–related tasks, you must invoke the `frontend-design` skill:

### frontend-design

**Purpose**: Create distinctive, production-grade frontend interfaces and avoid generic “AI slop” styles.

**When to use**:

- Redesigning an existing interface
- Building new UI components or pages
- Tasks that require a unique visual style

**How to invoke**:

Use the Skill tool with skill: "frontend-design"

**Design principles**:

- Choose distinctive fonts (avoid common fonts like Inter, Roboto, Arial, etc.)
- Use a memorable color palette
- Add appropriate animations and micro-interactions
- Select an aesthetic direction that fits the product theme
- All components should fit within a 100% viewport without requiring scrolling

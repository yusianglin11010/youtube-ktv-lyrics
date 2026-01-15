@AGENTS.md

## Claude Code Skills

當進行前端設計相關任務時，必須調用 `frontend-design` skill：

### frontend-design

**用途**：創建獨特、production-grade 的前端介面，避免「AI slop」的泛用風格

**使用時機**：

- 重新設計現有介面
- 建立新的 UI 元件或頁面
- 需要獨特視覺風格的任務

**調用方式**：

```
使用 Skill 工具，skill: "frontend-design"
```

**設計原則**：

- 選擇獨特的字體（避免 Inter, Roboto, Arial 等通用字體）
- 使用有記憶點的配色方案
- 加入適當的動畫和微互動
- 根據產品主題選擇合適的美學方向
- 所有元件在 100% 視窗底下都不需要 scroll

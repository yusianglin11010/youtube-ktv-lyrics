/**
 * YouTube KTV Lyrics - Export Module
 * 負責匯出功能
 */

const Export = (function() {
    'use strict';

    /**
     * 匯出時間戳記
     */
    function exportTimestamps() {
        // 優先使用 pinyinTimestamps
        let usePinyinData = MakerState.pinyinTimestamps.length > 0;
        let dataSource = usePinyinData ? MakerState.pinyinTimestamps : MakerState.timestamps;

        if (dataSource.length === 0) {
            alert("❌ 沒有可下載的時間紀錄！");
            return;
        }

        // 取得 YouTube 影片標題 & 網址
        let videoData = VideoController.getVideoData();
        let videoTitle = videoData.title || "ktv_timestamps";
        let videoUrl = document.getElementById("videoUrl").value || "未知網址";

        // 建立內容標頭
        let header = `${videoTitle}\n${videoUrl}\n`;

        if (MakerState.pinyinEnabled) {
            header += "#PINYIN_ENABLED\n";
        }

        header += "\n";

        // 產生時間紀錄的內容
        let content;
        if (usePinyinData) {
            content = header + MakerState.pinyinTimestamps.map(p => {
                let lineIdx = p.line - 1;
                let wordIdx = p.syllableIndex - 1;
                let mainWord = (MakerState.lyrics[lineIdx] && MakerState.lyrics[lineIdx][wordIdx])
                    ? MakerState.lyrics[lineIdx][wordIdx]
                    : p.syllable;

                let baseLine = `Line ${p.line} | Word ${p.syllableIndex} | ${p.start} → ${p.end} | ${mainWord} | ${p.syllable}`;
                if (p.role) {
                    baseLine += ` | ${p.role}`;
                }
                return baseLine;
            }).join("\n");
        } else {
            content = header + MakerState.timestamps.map(t => {
                let baseLine = `Line ${t.line} | Word ${t.wordIndex} | ${t.start} → ${t.end} | ${t.word}`;
                if (MakerState.pinyinEnabled) {
                    baseLine += ` | ${t.pinyin || ''}`;
                }
                if (t.role) {
                    if (!MakerState.pinyinEnabled) {
                        baseLine += ` |`;
                    }
                    baseLine += ` | ${t.role}`;
                }
                return baseLine;
            }).join("\n");
        }

        // 加入結尾慶祝文字
        content += "\n\n☆～來賓請掌聲鼓勵～☆\n☆～把酒同歡 歡樂無限～☆";

        // 創建下載連結
        let blob = new Blob([content], { type: "text/plain" });
        let a = document.createElement("a");

        let safeTitle = videoTitle.replace(/[<>:"/\\|?*]+/g, "");
        a.href = URL.createObjectURL(blob);
        a.download = `${safeTitle}.txt`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return {
        exportTimestamps
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Export;
}

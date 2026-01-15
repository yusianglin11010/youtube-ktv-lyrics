/**
 * YouTube KTV Lyrics - Group Mapping Module
 * 負責拼音映射對話框
 */

const GroupMapping = (function() {
    'use strict';

    // 內部狀態
    let state = {
        currentLine: 0,
        pinyinData: [],
        lyricsData: [],
        mappings: [],
        selection: [],
        pinyinFocus: 0,
        lyricFocus: 0
    };

    let keyboardHandler = null;

    // ========== Dialog Lifecycle ==========

    function openDialog() {
        // Check if there are existing mappings
        if (MakerState.pinyinToLyricMappings && MakerState.pinyinToLyricMappings.length > 0) {
            if (!confirm("偵測到已有群組 mapping 紀錄。\n\n重新開始會清除之前的 mapping，是否繼續？")) {
                return;
            }
        }

        // Prepare data
        let data = prepareData();
        if (!data) return;

        // Initialize state
        state.currentLine = 0;
        state.pinyinData = data.pinyinLines;
        state.lyricsData = data.lyricsLines;
        state.mappings = [];
        state.selection = [];
        state.pinyinFocus = 0;
        state.lyricFocus = 0;

        // Render interface
        renderInterface();

        // Show dialog
        let dialog = document.getElementById("groupMappingDialog");
        dialog.showModal();

        // Attach keyboard handlers
        attachKeyboardHandlers();
    }

    function closeDialog() {
        if (state.mappings.length > 0) {
            if (!confirm("您有未儲存的 mapping 紀錄。\n\n關閉視窗將會遺失這些紀錄，是否繼續？")) {
                return;
            }
        }

        let dialog = document.getElementById("groupMappingDialog");
        dialog.close();
        removeKeyboardHandlers();
    }

    // ========== Data Parsing ==========

    function prepareData() {
        let pinyinInput = document.getElementById("pinyinInput").value.trim();
        let lyricsInput = document.getElementById("lyricsInput").value.trim();

        if (!pinyinInput) {
            alert("❌ 請先輸入拼音！");
            return null;
        }

        if (!lyricsInput) {
            alert("❌ 請先輸入主歌詞！");
            return null;
        }

        let pinyinLines = pinyinInput.split("\n")
            .map(line => LyricsProcessor.parsePinyinLineForGrouping(line))
            .filter(line => line.length > 0);

        let lyricsLines = lyricsInput.split("\n")
            .map(line => LyricsProcessor.parseLyricsLine(line))
            .filter(line => line.length > 0);

        if (pinyinLines.length !== lyricsLines.length) {
            alert(`❌ 行數不對齊！\n拼音：${pinyinLines.length} 行\n主歌詞：${lyricsLines.length} 行`);
            return null;
        }

        console.log('Prepared data:', { pinyinLines, lyricsLines });

        return {
            pinyinLines,
            lyricsLines,
            lineCount: pinyinLines.length
        };
    }

    // ========== Interface Rendering ==========

    function renderInterface() {
        let container = document.getElementById("groupMappingArea");
        let line = state.currentLine;
        let pinyinList = state.pinyinData[line];
        let lyricsList = state.lyricsData[line];
        let lineMappings = state.mappings.filter(m => m.line === line);

        console.log('Rendering line:', line);
        console.log('Pinyin list:', pinyinList);
        console.log('Lyrics list:', lyricsList);

        // Render pinyin list
        let pinyinHTML = pinyinList.map((syllable, idx) => {
            let classes = ['pinyin-item'];
            if (idx === state.pinyinFocus) classes.push('focused');
            if (state.selection.includes(idx)) classes.push('selected');
            if (isMappedPinyin(line, idx)) classes.push('mapped');
            return `<div class="${classes.join(' ')}" data-idx="${idx}">${syllable}</div>`;
        }).join('');

        // Render lyrics list with color indicators
        let lyricsHTML = lyricsList.map((char, idx) => {
            let classes = ['lyric-item'];
            if (idx === state.lyricFocus) classes.push('focused');

            let mapping = lineMappings.find(m => m.lyricIdx === idx);
            if (mapping) {
                classes.push('mapped');
                let pinyinAnnotation = `<div class="lyric-pinyin-annotation">${mapping.pinyin}</div>`;
                return `<div class="${classes.join(' ')}" data-idx="${idx}">${pinyinAnnotation}<div class="lyric-char">${char}</div></div>`;
            }

            return `<div class="${classes.join(' ')}" data-idx="${idx}">${char}</div>`;
        }).join('');

        let progressHTML = getMappingProgress(line);

        container.innerHTML = `
            <div class="mapping-section">
                <div class="section-title">拼音音節（← → 移動，Space 選取/取消）</div>
                <div class="pinyin-list-horizontal">
                    ${pinyinHTML}
                </div>
            </div>
            <div class="mapping-section">
                <div class="section-title">主歌詞（W/A 左移，D 右移，Enter 連結 | Backspace 刪除上一個）</div>
                <div class="lyrics-list-horizontal">
                    ${lyricsHTML}
                </div>
            </div>
            <div class="mapping-progress">
                ${progressHTML}
            </div>
        `;

        attachClickHandlers();
    }

    function getMappingProgress(line) {
        let pinyinList = state.pinyinData[line];
        let lyricsList = state.lyricsData[line];
        let lineMappings = state.mappings.filter(m => m.line === line);

        let mappedPinyin = new Set();
        lineMappings.forEach(m => {
            m.pinyinIndices.forEach(idx => mappedPinyin.add(idx));
        });

        let mappedLyrics = new Set(lineMappings.map(m => m.lyricIdx));

        let lineInfo = `<span>第 ${line + 1} 行 / 共 ${state.pinyinData.length} 行</span>`;
        let completeness = `<span>拼音：${mappedPinyin.size}/${pinyinList.length} | 主歌詞：${mappedLyrics.size}/${lyricsList.length}</span>`;

        return lineInfo + completeness;
    }

    // ========== Helper Functions ==========

    function isMappedPinyin(line, idx) {
        return state.mappings.some(m =>
            m.line === line && m.pinyinIndices.includes(idx)
        );
    }

    function isMappedLyric(line, idx) {
        return state.mappings.some(m =>
            m.line === line && m.lyricIdx === idx
        );
    }

    // ========== Interaction Logic ==========

    function attachKeyboardHandlers() {
        keyboardHandler = (e) => {
            let line = state.currentLine;
            let pinyinList = state.pinyinData[line];
            let lyricsList = state.lyricsData[line];

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (state.pinyinFocus > 0) {
                    state.pinyinFocus--;
                    renderInterface();
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (state.pinyinFocus < pinyinList.length - 1) {
                    state.pinyinFocus++;
                    renderInterface();
                }
            } else if (e.key === ' ') {
                e.preventDefault();
                togglePinyinSelection(state.pinyinFocus);
                if (state.pinyinFocus < pinyinList.length - 1) {
                    state.pinyinFocus++;
                    renderInterface();
                }
            } else if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'a') {
                e.preventDefault();
                if (state.lyricFocus > 0) {
                    state.lyricFocus--;
                    renderInterface();
                }
            } else if (e.key.toLowerCase() === 'd') {
                e.preventDefault();
                if (state.lyricFocus < lyricsList.length - 1) {
                    state.lyricFocus++;
                    renderInterface();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                createMapping();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                deleteLastMapping();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (state.selection.length > 0) {
                    state.selection = [];
                    renderInterface();
                } else {
                    closeDialog();
                }
            }
        };

        document.addEventListener('keydown', keyboardHandler);
    }

    function removeKeyboardHandlers() {
        if (keyboardHandler) {
            document.removeEventListener('keydown', keyboardHandler);
            keyboardHandler = null;
        }
    }

    function attachClickHandlers() {
        document.querySelectorAll('.pinyin-item').forEach(item => {
            item.addEventListener('click', () => {
                let idx = parseInt(item.dataset.idx);
                if (!item.classList.contains('mapped')) {
                    togglePinyinSelection(idx);
                }
            });
        });

        document.querySelectorAll('.lyric-item').forEach(item => {
            item.addEventListener('click', () => {
                let idx = parseInt(item.dataset.idx);
                if (!item.classList.contains('mapped')) {
                    state.lyricFocus = idx;
                    createMapping();
                }
            });
        });
    }

    function togglePinyinSelection(idx) {
        let line = state.currentLine;
        if (isMappedPinyin(line, idx)) return;

        let selection = state.selection;
        let position = selection.indexOf(idx);

        if (position !== -1) {
            selection.splice(position, 1);
        } else {
            selection.push(idx);
            selection.sort((a, b) => a - b);
        }

        renderInterface();
    }

    function createMapping() {
        let line = state.currentLine;
        let lyricIdx = state.lyricFocus;
        let selection = state.selection;

        if (selection.length === 0) {
            alert("請先選取拼音音節！");
            return;
        }

        if (isMappedLyric(line, lyricIdx)) {
            alert("這個字已經被連結過了！");
            return;
        }

        let alreadyMapped = selection.some(idx => isMappedPinyin(line, idx));
        if (alreadyMapped) {
            alert("選取的拼音中有些已經被 mapping 過了！");
            return;
        }

        let pinyinList = state.pinyinData[line];
        let lyricsList = state.lyricsData[line];

        let mapping = {
            line: line,
            pinyinIndices: [...selection],
            lyricIdx: lyricIdx,
            pinyin: selection.map(idx => pinyinList[idx]).join(' '),
            lyric: lyricsList[lyricIdx]
        };

        state.mappings.push(mapping);
        state.selection = [];

        if (state.lyricFocus < lyricsList.length - 1) {
            state.lyricFocus++;
        }

        renderInterface();
    }

    function deleteMapping(globalIdx) {
        state.mappings.splice(globalIdx, 1);
        renderInterface();
    }

    function deleteLastMapping() {
        let line = state.currentLine;
        let lineMappings = state.mappings.filter(m => m.line === line);

        if (lineMappings.length === 0) return;

        let lastMapping = lineMappings[lineMappings.length - 1];
        let globalIdx = state.mappings.indexOf(lastMapping);

        state.mappings.splice(globalIdx, 1);
        state.lyricFocus = lastMapping.lyricIdx;

        renderInterface();
    }

    // ========== Line Navigation ==========

    function nextLine() {
        if (state.currentLine >= state.pinyinData.length - 1) return;

        let validation = validateLineMapping(state.currentLine);
        if (!validation.complete) {
            if (!confirm(`第 ${state.currentLine + 1} 行尚未完成 mapping：\n${validation.message}\n\n是否仍要繼續到下一行？`)) {
                return;
            }
        }

        state.currentLine++;
        state.selection = [];
        state.pinyinFocus = 0;
        state.lyricFocus = 0;
        renderInterface();
    }

    function prevLine() {
        if (state.currentLine <= 0) return;

        state.currentLine--;
        state.selection = [];
        state.pinyinFocus = 0;
        state.lyricFocus = 0;
        renderInterface();
    }

    function validateLineMapping(line) {
        let pinyinList = state.pinyinData[line];
        let lyricsList = state.lyricsData[line];
        let lineMappings = state.mappings.filter(m => m.line === line);

        let mappedPinyin = new Set();
        lineMappings.forEach(m => {
            m.pinyinIndices.forEach(idx => mappedPinyin.add(idx));
        });

        if (mappedPinyin.size < pinyinList.length) {
            return {
                complete: false,
                message: `還有 ${pinyinList.length - mappedPinyin.size} 個拼音音節未 mapping`
            };
        }

        let mappedLyrics = new Set(lineMappings.map(m => m.lyricIdx));
        if (mappedLyrics.size < lyricsList.length) {
            return {
                complete: false,
                message: `還有 ${lyricsList.length - mappedLyrics.size} 個主歌詞字元未 mapping`
            };
        }

        return { complete: true };
    }

    // ========== Data Output ==========

    function generateGroupedPinyinText() {
        let result = [];

        for (let lineIdx = 0; lineIdx < state.pinyinData.length; lineIdx++) {
            let lineMappings = state.mappings
                .filter(m => m.line === lineIdx)
                .sort((a, b) => a.lyricIdx - b.lyricIdx);

            if (lineMappings.length === 0) {
                result.push(state.pinyinData[lineIdx].join(' '));
                continue;
            }

            let lineGroups = lineMappings.map(m => {
                let syllables = m.pinyinIndices.map(idx =>
                    state.pinyinData[lineIdx][idx]
                );

                if (syllables.length > 1) {
                    return `[${syllables.join(' ')}]`;
                } else {
                    return syllables[0];
                }
            });

            result.push(lineGroups.join(' '));
        }

        return result.join('\n');
    }

    function mergePinyinTimestamps() {
        if (MakerState.pinyinTimestamps.length === 0) return;

        let mergeMap = new Map();

        state.mappings.forEach(mapping => {
            if (mapping.pinyinIndices.length > 1) {
                let line = mapping.line + 1;
                let firstIdx = mapping.pinyinIndices[0] + 1;
                let key = `${line}-${firstIdx}`;
                mergeMap.set(key, {
                    line: line,
                    pinyinIndices: mapping.pinyinIndices.map(i => i + 1),
                    combinedPinyin: mapping.pinyin
                });
            }
        });

        if (mergeMap.size === 0) return;

        let indicesToRemove = new Set();
        let mergedEntries = [];

        mergeMap.forEach((mergeInfo) => {
            let groupEntries = mergeInfo.pinyinIndices.map(syllableIdx => {
                return MakerState.pinyinTimestamps.find(p =>
                    p.line === mergeInfo.line && p.syllableIndex === syllableIdx
                );
            }).filter(Boolean);

            if (groupEntries.length === mergeInfo.pinyinIndices.length) {
                let mergedEntry = {
                    line: mergeInfo.line,
                    syllableIndex: mergeInfo.pinyinIndices[0],
                    start: groupEntries[0].start,
                    end: groupEntries[groupEntries.length - 1].end,
                    syllable: mergeInfo.combinedPinyin,
                    role: groupEntries[0].role,
                    mappedToWord: null
                };

                mergedEntries.push(mergedEntry);

                mergeInfo.pinyinIndices.forEach(syllableIdx => {
                    indicesToRemove.add(`${mergeInfo.line}-${syllableIdx}`);
                });
            }
        });

        let newTimestamps = [];

        MakerState.pinyinTimestamps.forEach(entry => {
            let key = `${entry.line}-${entry.syllableIndex}`;
            if (!indicesToRemove.has(key)) {
                newTimestamps.push({ ...entry });
            }
        });

        newTimestamps.push(...mergedEntries);

        newTimestamps.sort((a, b) => {
            if (a.line !== b.line) return a.line - b.line;
            return a.syllableIndex - b.syllableIndex;
        });

        let lineCounters = {};
        newTimestamps.forEach(entry => {
            if (!lineCounters[entry.line]) {
                lineCounters[entry.line] = 1;
            }
            entry.syllableIndex = lineCounters[entry.line]++;
        });

        MakerState.pinyinTimestamps = newTimestamps;
        console.log('Merged pinyinTimestamps:', MakerState.pinyinTimestamps);
    }

    function save() {
        let incomplete = [];
        for (let i = 0; i < state.pinyinData.length; i++) {
            let validation = validateLineMapping(i);
            if (!validation.complete) {
                incomplete.push(`第 ${i + 1} 行：${validation.message}`);
            }
        }

        if (incomplete.length > 0) {
            if (!confirm(`以下行尚未完成 mapping：\n\n${incomplete.join('\n')}\n\n是否仍要儲存？（未完成的行不會套用群組語法）`)) {
                return;
            }
        }

        let groupedText = generateGroupedPinyinText();
        document.getElementById("pinyinInput").value = groupedText;

        mergePinyinTimestamps();

        MakerState.pinyinToLyricMappings = state.mappings.map(m => ({
            ...m,
            line: m.line + 1,
            lyricIdx: m.lyricIdx + 1,
            wordIndex: m.lyricIdx + 1
        }));

        alert("✅ 拼音群組已儲存到輸入欄位！\n\n拼音已更新為群組格式，請確認結果。");

        let dialog = document.getElementById("groupMappingDialog");
        dialog.close();
        removeKeyboardHandlers();
    }

    /**
     * 取得內部狀態（供外部使用）
     */
    function getState() {
        return state;
    }

    return {
        openDialog,
        closeDialog,
        nextLine,
        prevLine,
        save,
        deleteMapping,
        getState
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GroupMapping;
}

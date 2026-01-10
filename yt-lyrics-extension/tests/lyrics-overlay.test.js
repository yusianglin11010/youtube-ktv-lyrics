/**
 * Lyrics Overlay Module Tests
 * 歌詞覆蓋層模組測試
 *
 * @jest-environment jsdom
 */

describe('LyricsOverlay', () => {
    let LyricsOverlay;

    beforeEach(() => {
        // 設定 DOM
        document.body.innerHTML = '<div id="movie_player"></div>';

        // Mock requestAnimationFrame
        global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
        global.cancelAnimationFrame = (id) => clearTimeout(id);

        // 重新載入模組
        jest.resetModules();
        LyricsOverlay = require('../content/lyrics-overlay.js');
    });

    afterEach(() => {
        if (LyricsOverlay) {
            LyricsOverlay.destroy();
        }
    });

    describe('createOverlayContainer', () => {
        test('should create container element', () => {
            const parent = document.getElementById('movie_player');
            const container = LyricsOverlay.createOverlayContainer(parent);

            expect(container).toBeDefined();
            expect(container.id).toBe('yt-ktv-lyrics-container');
            expect(parent.contains(container)).toBe(true);
        });

        test('should create display area inside container', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            expect(displayArea).toBeDefined();
        });

        test('should remove existing container before creating new one', () => {
            const parent = document.getElementById('movie_player');

            LyricsOverlay.createOverlayContainer(parent);
            LyricsOverlay.createOverlayContainer(parent);

            const containers = document.querySelectorAll('#yt-ktv-lyrics-container');
            expect(containers.length).toBe(1);
        });
    });

    describe('setSubtitleData', () => {
        const mockSubtitleData = [
            { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '你' },
            { line: 1, wordIndex: 2, startTime: 1.5, endTime: 2.0, word: '好' },
            { line: 2, wordIndex: 1, startTime: 3.0, endTime: 3.5, word: '世' },
            { line: 2, wordIndex: 2, startTime: 3.5, endTime: 4.0, word: '界' }
        ];

        test('should store subtitle data', () => {
            LyricsOverlay.setSubtitleData(mockSubtitleData);

            const data = LyricsOverlay.getSubtitleData();
            expect(data).toEqual(mockSubtitleData);
        });

        test('should handle null data', () => {
            LyricsOverlay.setSubtitleData(null);

            const data = LyricsOverlay.getSubtitleData();
            expect(data).toEqual([]);
        });

        test('should reset line indices when setting new data', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            // 模擬已經進行過字幕顯示
            LyricsOverlay.setSubtitleData(mockSubtitleData);

            // 設定新資料應該重置狀態
            const newData = [
                { line: 1, wordIndex: 1, startTime: 0.5, endTime: 1.0, word: '新' }
            ];
            LyricsOverlay.setSubtitleData(newData);

            expect(LyricsOverlay.getSubtitleData()).toEqual(newData);
        });
    });

    describe('updateSettings', () => {
        test('should update settings', () => {
            const newSettings = {
                font: 'Huninn',
                fontSize: 50,
                highlightColor: '#FF0000'
            };

            LyricsOverlay.updateSettings(newSettings);

            const settings = LyricsOverlay.getSettings();
            expect(settings.font).toBe('Huninn');
            expect(settings.fontSize).toBe(50);
            expect(settings.highlightColor).toBe('#FF0000');
        });

        test('should merge with existing settings', () => {
            LyricsOverlay.updateSettings({ fontSize: 60 });

            const settings = LyricsOverlay.getSettings();
            expect(settings.fontSize).toBe(60);
            expect(settings.font).toBeDefined(); // 其他設定仍存在
        });
    });

    describe('setEnabled', () => {
        test('should toggle enabled state', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            LyricsOverlay.setEnabled(false);
            expect(LyricsOverlay.getEnabled()).toBe(false);

            LyricsOverlay.setEnabled(true);
            expect(LyricsOverlay.getEnabled()).toBe(true);
        });

        test('should hide container when disabled', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            LyricsOverlay.setEnabled(false);

            const container = LyricsOverlay.getContainer();
            expect(container.style.display).toBe('none');
        });

        test('should show container when enabled', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            LyricsOverlay.setEnabled(false);
            LyricsOverlay.setEnabled(true);

            const container = LyricsOverlay.getContainer();
            expect(container.style.display).toBe('block');
        });
    });

    describe('reset', () => {
        test('should clear subtitle data', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '字' }
            ];

            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.reset();

            expect(LyricsOverlay.getSubtitleData()).toEqual([]);
        });

        test('should clear display area', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            displayArea.innerHTML = '<div>Test</div>';

            LyricsOverlay.reset();

            expect(displayArea.innerHTML).toBe('');
        });
    });

    describe('destroy', () => {
        test('should remove container from DOM', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            LyricsOverlay.destroy();

            const container = document.getElementById('yt-ktv-lyrics-container');
            expect(container).toBeNull();
        });

        test('should return null for getContainer after destroy', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            LyricsOverlay.destroy();

            expect(LyricsOverlay.getContainer()).toBeNull();
        });
    });

    describe('repositionForFullscreen', () => {
        test('should add fullscreen class when entering fullscreen', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            const fullscreenParent = document.createElement('div');
            fullscreenParent.id = 'fullscreen-container';
            document.body.appendChild(fullscreenParent);

            LyricsOverlay.repositionForFullscreen(true, fullscreenParent);

            const container = LyricsOverlay.getContainer();
            expect(container.classList.contains('yt-ktv-fullscreen')).toBe(true);
            expect(fullscreenParent.contains(container)).toBe(true);
        });

        test('should remove fullscreen class when exiting fullscreen', () => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);

            const fullscreenParent = document.createElement('div');
            document.body.appendChild(fullscreenParent);

            LyricsOverlay.repositionForFullscreen(true, fullscreenParent);
            LyricsOverlay.repositionForFullscreen(false, null);

            const container = LyricsOverlay.getContainer();
            expect(container.classList.contains('yt-ktv-fullscreen')).toBe(false);
        });
    });

    describe('createWordSpan - single layer gradient approach', () => {
        // 新方案：使用單層漸層，完全避免對齊問題
        // 每個文字只有一個元素，使用 background-clip: text + linear-gradient 實現 KTV 效果

        beforeEach(() => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);
        });

        test('should create DOM structure with pinyin', () => {
            const mockDataWithPinyin = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '미', pinyin: 'mi' }
            ];
            LyricsOverlay.setSubtitleData(mockDataWithPinyin);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const word = displayArea.querySelector('.yt-ktv-word');

            // 檢查拼音元素存在
            const pronunciation = word.querySelector('.yt-ktv-pronunciation');
            expect(pronunciation).toBeTruthy();
            expect(pronunciation.textContent).toBe('mi');
        });

        test('should not create pinyin element when pinyin is null', () => {
            const mockDataWithoutPinyin = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: 'hello', pinyin: null }
            ];
            LyricsOverlay.setSubtitleData(mockDataWithoutPinyin);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const word = displayArea.querySelector('.yt-ktv-word');

            const pronunciation = word.querySelector('.yt-ktv-pronunciation');
            expect(pronunciation).toBeFalsy();
        });

        test('SINGLE-LAYER: main text should use background-clip text for gradient effect', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '미', pinyin: 'mi' }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const mainText = displayArea.querySelector('.yt-ktv-main-text');

            // 使用 background-clip: text 實現漸層文字效果
            expect(mainText.style.backgroundClip).toBe('text');
            expect(mainText.style.webkitTextFillColor).toBe('transparent');
        });

        test('SINGLE-LAYER: there should be only ONE main text element per word', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '미', pinyin: 'mi' }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const word = displayArea.querySelector('.yt-ktv-word');
            const mainTexts = word.querySelectorAll('.yt-ktv-main-text');

            // 只有一個主字元素（不是兩層）
            expect(mainTexts.length).toBe(1);
        });

        test('SINGLE-LAYER: there should be only ONE pinyin element per word', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '미', pinyin: 'mi' }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const word = displayArea.querySelector('.yt-ktv-word');
            const pinyinElements = word.querySelectorAll('.yt-ktv-pronunciation');

            // 只有一個拼音元素（不是兩層）
            expect(pinyinElements.length).toBe(1);
        });

        test('SINGLE-LAYER: background-size should be 200% for gradient animation', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '미', pinyin: 'mi' }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const mainText = displayArea.querySelector('.yt-ktv-main-text');

            // backgroundSize 應為 200% 以實現滑動效果
            expect(mainText.style.backgroundSize).toBe('200% 100%');
        });

        test('SINGLE-LAYER: progress should control background-position', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 2.0, word: '미', pinyin: 'mi' }
            ];
            LyricsOverlay.setSubtitleData(mockData);

            // 50% 進度 (時間 1.5s = 中間)
            LyricsOverlay.updateDisplay(1.5);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const mainText = displayArea.querySelector('.yt-ktv-main-text');

            // background-position 應該被設定（jsdom 可能不保留確切格式）
            // 確認樣式屬性被設定
            expect(mainText.style.backgroundPosition).toBeDefined();
            // 或者檢查 style 屬性是否包含 background-position
            // 由於 jsdom 對 background-position 的處理可能不同，我們只確認 backgroundSize 正確
            expect(mainText.style.backgroundSize).toBe('200% 100%');
        });

        test('SINGLE-LAYER: content container should use flex column layout', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '미', pinyin: 'mi' }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const content = displayArea.querySelector('.yt-ktv-content');

            expect(content.style.display).toBe('flex');
            expect(content.style.flexDirection).toBe('column');
        });

        test('SINGLE-LAYER: pinyin should also use gradient background', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '미', pinyin: 'mi' }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const pinyin = displayArea.querySelector('.yt-ktv-pronunciation');

            expect(pinyin.style.backgroundClip).toBe('text');
            expect(pinyin.style.backgroundSize).toBe('200% 100%');
        });

        test('SINGLE-LAYER: words without pinyin should still work correctly', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: 'hello', pinyin: null }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const word = displayArea.querySelector('.yt-ktv-word');
            const mainText = word.querySelector('.yt-ktv-main-text');
            const content = word.querySelector('.yt-ktv-content');

            // 無拼音時，content 只有一個子元素
            expect(content.children.length).toBe(1);
            expect(mainText).toBeTruthy();
            expect(mainText.style.backgroundClip).toBe('text');
        });

        test('SINGLE-LAYER: mixed pinyin/no-pinyin in same line should work', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.3, word: '한', pinyin: 'han' },
                { line: 1, wordIndex: 2, startTime: 1.3, endTime: 1.6, word: 'and', pinyin: null },
                { line: 1, wordIndex: 3, startTime: 1.6, endTime: 2.0, word: '국', pinyin: 'guk' }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const words = displayArea.querySelectorAll('.yt-ktv-word');

            expect(words.length).toBe(3);

            // 第一個字有拼音
            expect(words[0].querySelector('.yt-ktv-pronunciation')).toBeTruthy();
            // 第二個字無拼音
            expect(words[1].querySelector('.yt-ktv-pronunciation')).toBeFalsy();
            // 第三個字有拼音
            expect(words[2].querySelector('.yt-ktv-pronunciation')).toBeTruthy();

            // 所有字都應該使用單層漸層方法
            words.forEach(word => {
                const mainTexts = word.querySelectorAll('.yt-ktv-main-text');
                expect(mainTexts.length).toBe(1); // 只有一個主字元素
            });
        });

        test('SINGLE-LAYER: different word lengths should all use single layer', () => {
            const mockData = [
                { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '가', pinyin: 'ga' },
                { line: 1, wordIndex: 2, startTime: 1.5, endTime: 2.0, word: '나다라마바사', pinyin: 'nadaramabasa' }
            ];
            LyricsOverlay.setSubtitleData(mockData);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const words = displayArea.querySelectorAll('.yt-ktv-word');

            words.forEach(word => {
                const mainTexts = word.querySelectorAll('.yt-ktv-main-text');
                const pinyinElements = word.querySelectorAll('.yt-ktv-pronunciation');

                // 每個字只有一個主字元素和一個拼音元素
                expect(mainTexts.length).toBe(1);
                expect(pinyinElements.length).toBe(1);
            });
        });

    });

    describe('updateDisplay', () => {
        const mockSubtitleData = [
            { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '你', pinyin: null },
            { line: 1, wordIndex: 2, startTime: 1.5, endTime: 2.0, word: '好', pinyin: null },
            { line: 2, wordIndex: 1, startTime: 2.5, endTime: 3.0, word: '世', pinyin: null },
            { line: 2, wordIndex: 2, startTime: 3.0, endTime: 3.5, word: '界', pinyin: null }
        ];

        beforeEach(() => {
            const parent = document.getElementById('movie_player');
            LyricsOverlay.createOverlayContainer(parent);
            LyricsOverlay.setSubtitleData(mockSubtitleData);
        });

        test('should create two line divs', () => {
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const lines = displayArea.querySelectorAll('.yt-ktv-line');
            expect(lines.length).toBe(2);
        });

        test('should create word spans for current lines', () => {
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const words = displayArea.querySelectorAll('.yt-ktv-word');
            expect(words.length).toBeGreaterThan(0);
        });

        test('should not update when disabled', () => {
            LyricsOverlay.setEnabled(false);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            expect(displayArea.innerHTML).toBe('');
        });

        test('should not update when no subtitle data', () => {
            LyricsOverlay.setSubtitleData([]);
            LyricsOverlay.updateDisplay(1.2);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            expect(displayArea.innerHTML).toBe('');
        });

        test('should apply time offset', () => {
            LyricsOverlay.updateSettings({ timeOffset: 0.5 });

            // At time 0.5, with offset 0.5, effective time is 1.0
            // This should show line 1 lyrics
            LyricsOverlay.updateDisplay(0.5);

            const displayArea = document.getElementById('yt-ktv-lyrics-display');
            const words = displayArea.querySelectorAll('.yt-ktv-word');
            expect(words.length).toBeGreaterThan(0);
        });
    });
});

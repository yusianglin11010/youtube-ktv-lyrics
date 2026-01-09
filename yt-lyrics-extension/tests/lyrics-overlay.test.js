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

    describe('updateDisplay', () => {
        const mockSubtitleData = [
            { line: 1, wordIndex: 1, startTime: 1.0, endTime: 1.5, word: '你' },
            { line: 1, wordIndex: 2, startTime: 1.5, endTime: 2.0, word: '好' },
            { line: 2, wordIndex: 1, startTime: 2.5, endTime: 3.0, word: '世' },
            { line: 2, wordIndex: 2, startTime: 3.0, endTime: 3.5, word: '界' }
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

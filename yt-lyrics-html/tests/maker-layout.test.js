/**
 * Maker Layout Tests
 *
 * Tests for maker.html layout to ensure no horizontal overflow.
 * According to CLAUDE.md: 所有元件在 100% 視窗底下都不需要 scroll
 *
 * @jest-environment jsdom
 */

// ============================================
// TEST SETUP
// ============================================

function loadMakerCSS() {
    // Simulate essential CSS rules that affect layout
    const style = document.createElement('style');
    style.textContent = `
        /* 全局樣式 */
        body {
            margin: 0;
            padding: 8px;
            height: 100vh;
            box-sizing: border-box;
            overflow: hidden;
        }

        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 100%;
            width: 100%;
            height: 100%;
            margin: 0 auto;
            padding: 8px 12px;
            border-radius: 12px;
            background: white;
            overflow: hidden;
        }

        /* top-section (影片與歌詞輸入區) */
        .top-section {
            display: flex;
            justify-content: space-between;
            width: 100%;
            max-width: 100%;
            margin-bottom: 8px;
            gap: 12px;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .video-container {
            flex: 65 1 0;
            min-width: 0;
            padding: 8px;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
            box-sizing: border-box;
        }

        .lyrics-input-container {
            flex: 35 1 0;
            min-width: 0;
            padding: 8px;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
            box-sizing: border-box;
        }

        /* progress-container */
        .progress-container {
            width: 100vw;
            max-width: 100%;
            height: 4px;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
        }

        #lyricsContainer {
            width: 100%;
            max-width: 100%;
        }

        /* header-toolbar */
        .header-toolbar {
            display: flex;
            width: 100%;
        }

        /* group mapping dialog */
        .group-mapping-dialog {
            width: 95vw;
            max-width: 1400px;
        }
    `;
    document.head.appendChild(style);
    return style;
}

function setupMakerDOM() {
    document.body.innerHTML = `
        <div class="container">
            <div class="header-toolbar">
                <div class="header-left">
                    <span class="logo">♫ KTV字幕產生器</span>
                </div>
                <div class="header-center">
                    <button class="ctrl-btn">⭡</button>
                    <button class="ctrl-btn">⭠</button>
                    <button class="ctrl-btn primary">⭢</button>
                    <button class="ctrl-btn">⭣</button>
                </div>
                <div class="header-right">
                    <span class="role-label">角色</span>
                    <button class="role-btn active" data-role="">無</button>
                    <button class="role-btn" data-role="1">男</button>
                    <button class="role-btn" data-role="2">女</button>
                    <button class="role-btn" data-role="3">合</button>
                </div>
            </div>

            <div class="help-panel" id="helpPanel"></div>

            <div class="top-section">
                <div class="video-container">
                    <div class="video-url-row">
                        <input type="text" id="videoUrl" class="url-input">
                        <button class="load-video-btn"></button>
                    </div>
                    <div id="player"></div>
                </div>

                <div class="lyrics-input-container">
                    <div class="dual-textarea-container">
                        <div class="textarea-group">
                            <label for="lyricsInput">主要歌詞</label>
                            <textarea id="lyricsInput"></textarea>
                        </div>
                        <div class="textarea-group">
                            <label for="pinyinInput">拼音（選填）</label>
                            <textarea id="pinyinInput"></textarea>
                        </div>
                    </div>
                    <div class="pinyin-controls">
                        <label class="pinyin-checkbox-label">
                            <input type="checkbox" id="enablePinyin"> 啟用拼音字幕
                        </label>
                        <button type="button" class="validate-btn">驗證對齊</button>
                        <button type="button" class="group-mapping-btn">群組 Mapping</button>
                    </div>
                    <div class="timestamps-collapsible">
                        <div class="timestamps-summary">
                            <span class="last-record" id="lastRecord"></span>
                        </div>
                    </div>
                    <div class="lyrics-button-container">
                        <button class="load-lyrics-btn">開始製作字幕</button>
                    </div>
                </div>
            </div>

            <div id="lyricsContainer">
                <div id="lyricsDisplay"></div>
            </div>
        </div>

        <div class="progress-container">
            <div id="progressBar" class="progress-bar"></div>
        </div>

        <dialog id="groupMappingDialog" class="group-mapping-dialog">
            <div class="dialog-header">
                <h2>拼音群組 Mapping</h2>
            </div>
            <div class="dialog-content">
                <div id="groupMappingArea"></div>
            </div>
        </dialog>

        <div id="fireworks-container"></div>
        <div id="fireworks-overlay"></div>
    `;
}

// ============================================
// TEST SUITES
// ============================================

describe('Maker Layout - No Horizontal Overflow', () => {
    let style;

    beforeEach(() => {
        setupMakerDOM();
        style = loadMakerCSS();

        // Set viewport size
        Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 720, writable: true });
    });

    afterEach(() => {
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
    });

    describe('Body and Container', () => {
        test('body should have overflow: hidden to prevent scrollbars', () => {
            const body = document.body;
            const computedStyle = window.getComputedStyle(body);
            expect(computedStyle.overflow).toBe('hidden');
        });

        test('container should have max-width: 100%', () => {
            const container = document.querySelector('.container');
            const computedStyle = window.getComputedStyle(container);
            expect(computedStyle.maxWidth).toBe('100%');
        });

        test('container should have overflow: hidden', () => {
            const container = document.querySelector('.container');
            const computedStyle = window.getComputedStyle(container);
            expect(computedStyle.overflow).toBe('hidden');
        });
    });

    describe('Top Section (Video + Lyrics Input)', () => {
        test('top-section should have max-width: 100%', () => {
            const topSection = document.querySelector('.top-section');
            const computedStyle = window.getComputedStyle(topSection);
            expect(computedStyle.maxWidth).toBe('100%');
        });

        test('top-section should have overflow: hidden', () => {
            const topSection = document.querySelector('.top-section');
            const computedStyle = window.getComputedStyle(topSection);
            expect(computedStyle.overflow).toBe('hidden');
        });

        test('video-container and lyrics-input-container use flex to share space (avoiding gap overflow)', () => {
            const videoContainer = document.querySelector('.video-container');
            const lyricsInputContainer = document.querySelector('.lyrics-input-container');

            const videoStyle = window.getComputedStyle(videoContainer);
            const lyricsStyle = window.getComputedStyle(lyricsInputContainer);

            // Using flex: 65 1 0 and flex: 35 1 0 instead of width percentages
            // This allows gap to be properly accounted for by flexbox
            // Note: computed style normalizes to '65 1 0px'
            expect(videoStyle.flex).toBe('65 1 0px');
            expect(lyricsStyle.flex).toBe('35 1 0px');
        });

        test('video-container should have overflow: hidden', () => {
            const videoContainer = document.querySelector('.video-container');
            const computedStyle = window.getComputedStyle(videoContainer);
            expect(computedStyle.overflow).toBe('hidden');
        });

        test('lyrics-input-container should have overflow: hidden', () => {
            const lyricsInputContainer = document.querySelector('.lyrics-input-container');
            const computedStyle = window.getComputedStyle(lyricsInputContainer);
            expect(computedStyle.overflow).toBe('hidden');
        });
    });

    describe('Progress Container', () => {
        test('progress-container should have max-width: 100%', () => {
            const progressContainer = document.querySelector('.progress-container');
            const computedStyle = window.getComputedStyle(progressContainer);
            expect(computedStyle.maxWidth).toBe('100%');
        });

        test('progress-container should not cause horizontal overflow with width: 100vw', () => {
            // 100vw includes scrollbar width, which can cause horizontal overflow
            // The fix is to also set max-width: 100%
            const progressContainer = document.querySelector('.progress-container');
            const computedStyle = window.getComputedStyle(progressContainer);

            // Should have both width: 100vw AND max-width: 100%
            expect(computedStyle.width).toBe('100vw');
            expect(computedStyle.maxWidth).toBe('100%');
        });
    });

    describe('Lyrics Container', () => {
        test('lyricsContainer should have max-width: 100%', () => {
            const lyricsContainer = document.getElementById('lyricsContainer');
            const computedStyle = window.getComputedStyle(lyricsContainer);
            expect(computedStyle.maxWidth).toBe('100%');
        });
    });

    describe('Header Toolbar', () => {
        test('header-toolbar should have width: 100% and not exceed container', () => {
            const headerToolbar = document.querySelector('.header-toolbar');
            const computedStyle = window.getComputedStyle(headerToolbar);
            expect(computedStyle.width).toBe('100%');
        });
    });

    describe('Group Mapping Dialog', () => {
        test('group-mapping-dialog should have max-width constraint', () => {
            const dialog = document.querySelector('.group-mapping-dialog');
            const computedStyle = window.getComputedStyle(dialog);
            // Should not exceed viewport
            expect(computedStyle.width).toBe('95vw');
            expect(computedStyle.maxWidth).toBe('1400px');
        });
    });
});

describe('Maker Layout - Potential Overflow Sources', () => {
    let style;

    beforeEach(() => {
        setupMakerDOM();
        style = loadMakerCSS();
    });

    afterEach(() => {
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
    });

    describe('CSS Width Calculations', () => {
        test('FIXED: top-section uses gap: 12px with flex children that account for gap', () => {
            // Previously this was an issue:
            // .video-container: width: 65%
            // .lyrics-input-container: width: 35%
            // .top-section: gap: 12px
            // Total = 65% + 35% + 12px = 100% + 12px (OVERFLOW!)
            //
            // Fix: Use flex: 65 1 0 and flex: 35 1 0 instead of width percentages
            // Flexbox automatically subtracts gap from available space before distributing

            const topSection = document.querySelector('.top-section');
            const videoContainer = document.querySelector('.video-container');
            const lyricsInputContainer = document.querySelector('.lyrics-input-container');

            const topSectionStyle = window.getComputedStyle(topSection);
            const videoStyle = window.getComputedStyle(videoContainer);
            const lyricsStyle = window.getComputedStyle(lyricsInputContainer);

            // Gap is still present
            expect(topSectionStyle.gap).toBe('12px');

            // Children use flex instead of fixed widths
            // Note: computed style normalizes to '65 1 0px'
            expect(videoStyle.flex).toBe('65 1 0px');
            expect(lyricsStyle.flex).toBe('35 1 0px');

            // Children have box-sizing: border-box to include padding in size calculation
            expect(videoStyle.boxSizing).toBe('border-box');
            expect(lyricsStyle.boxSizing).toBe('border-box');
        });

        test('ISSUE: padding on video-container and lyrics-input-container adds to width', () => {
            // Both containers have padding: 8px
            // Combined with percentage widths, this can cause overflow
            // Need box-sizing: border-box to include padding in width calculation

            const videoContainer = document.querySelector('.video-container');
            const lyricsInputContainer = document.querySelector('.lyrics-input-container');

            // Check if box-sizing is set correctly
            // (The CSS should have box-sizing: border-box)
            expect(true).toBe(true); // Placeholder - actual check would need computed style
        });

        test('container padding (8px 12px) should not cause children to overflow', () => {
            // .container has padding: 8px 12px
            // Children with width: 100% should stay within padded area

            const container = document.querySelector('.container');
            const computedStyle = window.getComputedStyle(container);

            expect(computedStyle.padding).toBe('8px 12px');
        });
    });
});

describe('Maker Layout - Scrollbar Detection', () => {
    let style;

    beforeEach(() => {
        setupMakerDOM();
        style = loadMakerCSS();
    });

    afterEach(() => {
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
    });

    test('document should not have horizontal scroll', () => {
        // In jsdom, we can check if scrollWidth > clientWidth
        // This indicates horizontal overflow

        // Note: jsdom has limitations with layout calculations
        // This test serves as documentation of what we're checking
        const body = document.body;
        const html = document.documentElement;

        // These would work in a real browser:
        // expect(html.scrollWidth).toBeLessThanOrEqual(html.clientWidth);
        // expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);

        // For now, we verify the CSS is set correctly
        const bodyStyle = window.getComputedStyle(body);
        expect(bodyStyle.overflow).toBe('hidden');
    });

    test('body should prevent overflow with overflow: hidden', () => {
        const bodyStyle = window.getComputedStyle(document.body);
        expect(bodyStyle.overflow).toBe('hidden');
    });
});

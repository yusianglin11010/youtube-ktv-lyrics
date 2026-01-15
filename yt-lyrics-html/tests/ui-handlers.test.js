/**
 * UI Handlers Unit Tests
 *
 * Tests for ui-handlers.js module, focusing on:
 * - updateTimestampsTable: timestamps display in table
 * - updatePinyinTimestampsDisplay: pinyin timestamps display in table
 *
 * @jest-environment jsdom
 */

// ============================================
// MOCK SETUP
// ============================================

// Mock MakerState
global.MakerState = {
    lyrics: [],
    pinyinLyrics: [],
    timestamps: [],
    pinyinTimestamps: [],
    currentLineIndex: 0,
    currentWordIndex: 0,
    currentRole: '',
    pinyinEnabled: false,
    workflowPhase: 'INPUT',
    totalWordsInSong: 0,
    pinyinToLyricMappings: []
};

// Mock VideoController
global.VideoController = {
    getCurrentTime: jest.fn(() => 5.0),
    seekTo: jest.fn()
};

// Mock LyricsProcessor
global.LyricsProcessor = {
    formatTime: jest.fn((seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        const ms = Math.round((seconds % 1) * 100);
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(2, '0')}`;
    }),
    parseTimeToSeconds: jest.fn((timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const [min, sec, ms] = parts.map(parseFloat);
            return min * 60 + sec + (ms / 100);
        }
        return 0;
    })
};

// Mock SyncRecorder
global.SyncRecorder = {
    nextChar: jest.fn(),
    prevLine: jest.fn(),
    nextLine: jest.fn(),
    restartCurrentLine: jest.fn()
};

// Mock GroupMapping
global.GroupMapping = {
    openDialog: jest.fn()
};

// ============================================
// DOM SETUP HELPER
// ============================================

function setupDOM() {
    document.body.innerHTML = `
        <div id="lyricsDisplay"></div>
        <div id="lyricsContainer"></div>

        <table id="timestampsTable">
            <thead>
                <tr>
                    <th>行</th>
                    <th>字</th>
                    <th>開始</th>
                    <th>結束</th>
                    <th>角色</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>

        <div class="timestamps-details">
            <div class="table-wrapper"></div>
        </div>

        <div id="progressBar"></div>
        <span id="timestampProgress"></span>
        <span id="lastRecord"></span>
        <button id="downloadBtn" disabled></button>

        <div class="role-selector">
            <button class="role-btn active" data-role="">無</button>
            <button class="role-btn" data-role="1">男</button>
            <button class="role-btn" data-role="2">女</button>
            <button class="role-btn" data-role="3">合</button>
        </div>

        <div id="fireworks-container"></div>
        <div id="fireworks-overlay"></div>
    `;
}

// Reset MakerState before each test
function resetMakerState() {
    MakerState.lyrics = [];
    MakerState.pinyinLyrics = [];
    MakerState.timestamps = [];
    MakerState.pinyinTimestamps = [];
    MakerState.currentLineIndex = 0;
    MakerState.currentWordIndex = 0;
    MakerState.currentRole = '';
    MakerState.pinyinEnabled = false;
    MakerState.workflowPhase = 'INPUT';
    MakerState.totalWordsInSong = 0;
    MakerState.pinyinToLyricMappings = [];
}

// Load UIHandlers module
const UIHandlers = require('../maker/ui-handlers.js');

// ============================================
// TEST SUITES
// ============================================

describe('UIHandlers', () => {
    beforeEach(() => {
        setupDOM();
        resetMakerState();
        jest.clearAllMocks();
    });

    // ============================================
    // updateTimestampsTable Tests
    // ============================================
    describe('updateTimestampsTable()', () => {
        test('should render timestamps with correct column order: 行 | 字 | 開始 | 結束 | 角色', () => {
            // Arrange
            MakerState.timestamps = [
                { line: 1, wordIndex: 1, word: '你', start: '00:05:00', end: '00:05:50', role: '1' }
            ];

            // Act
            UIHandlers.updateTimestampsTable();

            // Assert
            const tbody = document.querySelector('#timestampsTable tbody');
            const row = tbody.querySelector('tr');
            const cells = row.querySelectorAll('td');

            expect(cells.length).toBe(5);
            expect(cells[0].textContent).toBe('1');        // 行
            expect(cells[1].textContent).toBe('你');       // 字
            expect(cells[2].textContent).toBe('00:05:00'); // 開始
            expect(cells[3].textContent).toBe('00:05:50'); // 結束
            expect(cells[4].textContent).toBe('男聲');     // 角色
        });

        test('should display "-" for timestamps without role', () => {
            MakerState.timestamps = [
                { line: 1, wordIndex: 1, word: '好', start: '00:06:00', end: '00:06:30', role: '' }
            ];

            UIHandlers.updateTimestampsTable();

            const tbody = document.querySelector('#timestampsTable tbody');
            const row = tbody.querySelector('tr');
            const cells = row.querySelectorAll('td');

            expect(cells[4].textContent).toBe('-');
        });

        test('should display "--:--:--" for timestamps with missing time', () => {
            MakerState.timestamps = [
                { line: 1, wordIndex: 1, word: '測', start: null, end: null, role: '' }
            ];

            UIHandlers.updateTimestampsTable();

            const tbody = document.querySelector('#timestampsTable tbody');
            const row = tbody.querySelector('tr');
            const cells = row.querySelectorAll('td');

            expect(cells[2].textContent).toBe('--:--:--');
            expect(cells[3].textContent).toBe('--:--:--');
        });

        test('should render multiple timestamps in correct order', () => {
            MakerState.timestamps = [
                { line: 1, wordIndex: 1, word: '你', start: '00:05:00', end: '00:05:50', role: '' },
                { line: 1, wordIndex: 2, word: '好', start: '00:05:50', end: '00:06:20', role: '2' },
                { line: 2, wordIndex: 1, word: '世', start: '00:10:00', end: '00:10:30', role: '' }
            ];

            UIHandlers.updateTimestampsTable();

            const tbody = document.querySelector('#timestampsTable tbody');
            const rows = tbody.querySelectorAll('tr');

            expect(rows.length).toBe(3);

            // First row
            expect(rows[0].querySelectorAll('td')[0].textContent).toBe('1');
            expect(rows[0].querySelectorAll('td')[1].textContent).toBe('你');

            // Second row
            expect(rows[1].querySelectorAll('td')[0].textContent).toBe('1');
            expect(rows[1].querySelectorAll('td')[1].textContent).toBe('好');
            expect(rows[1].querySelectorAll('td')[4].textContent).toBe('女聲');

            // Third row
            expect(rows[2].querySelectorAll('td')[0].textContent).toBe('2');
            expect(rows[2].querySelectorAll('td')[1].textContent).toBe('世');
        });

        test('should clear table when timestamps array is empty', () => {
            // Setup initial data
            MakerState.timestamps = [
                { line: 1, wordIndex: 1, word: '測', start: '00:01:00', end: '00:01:30', role: '' }
            ];
            UIHandlers.updateTimestampsTable();

            // Clear timestamps
            MakerState.timestamps = [];
            UIHandlers.updateTimestampsTable();

            const tbody = document.querySelector('#timestampsTable tbody');
            expect(tbody.innerHTML).toBe('');
        });
    });

    // ============================================
    // updatePinyinTimestampsDisplay Tests
    // ============================================
    describe('updatePinyinTimestampsDisplay()', () => {
        test('should render pinyin timestamps with correct column order: 行 | 字 | 開始 | 結束 | 角色', () => {
            // Arrange
            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'ni', start: '00:05:00', end: '00:05:50', role: '1' }
            ];

            // Act
            UIHandlers.updatePinyinTimestampsDisplay();

            // Assert
            const tbody = document.querySelector('#timestampsTable tbody');
            const row = tbody.querySelector('tr');
            const cells = row.querySelectorAll('td');

            expect(cells.length).toBe(5);
            expect(cells[0].textContent).toBe('1');        // 行
            expect(cells[1].textContent).toBe('ni');       // 字 (syllable)
            expect(cells[2].textContent).toBe('00:05:00'); // 開始
            expect(cells[3].textContent).toBe('00:05:50'); // 結束
            expect(cells[4].textContent).toBe('男聲');     // 角色
        });

        test('should display "-" for pinyin timestamps without role', () => {
            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'hao', start: '00:06:00', end: '00:06:30', role: '' }
            ];

            UIHandlers.updatePinyinTimestampsDisplay();

            const tbody = document.querySelector('#timestampsTable tbody');
            const row = tbody.querySelector('tr');
            const cells = row.querySelectorAll('td');

            expect(cells[4].textContent).toBe('-');
        });

        test('should display "--:--:--" for pinyin timestamps with missing time', () => {
            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'ce', start: null, end: null, role: '' }
            ];

            UIHandlers.updatePinyinTimestampsDisplay();

            const tbody = document.querySelector('#timestampsTable tbody');
            const row = tbody.querySelector('tr');
            const cells = row.querySelectorAll('td');

            expect(cells[2].textContent).toBe('--:--:--');
            expect(cells[3].textContent).toBe('--:--:--');
        });

        test('should render multiple pinyin timestamps correctly', () => {
            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'ko', start: '00:32:55', end: '00:33:02', role: '' },
                { line: 1, syllableIndex: 2, syllable: 'na', start: '00:33:02', end: '00:33:34', role: '' },
                { line: 1, syllableIndex: 3, syllable: 'yu', start: '00:33:34', end: '00:33:52', role: '' },
                { line: 1, syllableIndex: 4, syllable: 'ki', start: '00:33:52', end: '00:34:52', role: '' }
            ];

            UIHandlers.updatePinyinTimestampsDisplay();

            const tbody = document.querySelector('#timestampsTable tbody');
            const rows = tbody.querySelectorAll('tr');

            expect(rows.length).toBe(4);

            // Verify each row has correct column order
            // Row 1: ko
            let cells = rows[0].querySelectorAll('td');
            expect(cells[0].textContent).toBe('1');        // 行
            expect(cells[1].textContent).toBe('ko');       // 字
            expect(cells[2].textContent).toBe('00:32:55'); // 開始
            expect(cells[3].textContent).toBe('00:33:02'); // 結束
            expect(cells[4].textContent).toBe('-');        // 角色

            // Row 2: na
            cells = rows[1].querySelectorAll('td');
            expect(cells[0].textContent).toBe('1');        // 行
            expect(cells[1].textContent).toBe('na');       // 字
            expect(cells[2].textContent).toBe('00:33:02'); // 開始
            expect(cells[3].textContent).toBe('00:33:34'); // 結束

            // Row 3: yu
            cells = rows[2].querySelectorAll('td');
            expect(cells[0].textContent).toBe('1');        // 行
            expect(cells[1].textContent).toBe('yu');       // 字
            expect(cells[2].textContent).toBe('00:33:34'); // 開始
            expect(cells[3].textContent).toBe('00:33:52'); // 結束

            // Row 4: ki
            cells = rows[3].querySelectorAll('td');
            expect(cells[0].textContent).toBe('1');        // 行
            expect(cells[1].textContent).toBe('ki');       // 字
            expect(cells[2].textContent).toBe('00:33:52'); // 開始
            expect(cells[3].textContent).toBe('00:34:52'); // 結束
        });

        test('should handle multi-line pinyin timestamps', () => {
            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'ni', start: '00:05:00', end: '00:05:50', role: '' },
                { line: 1, syllableIndex: 2, syllable: 'hao', start: '00:05:50', end: '00:06:20', role: '' },
                { line: 2, syllableIndex: 1, syllable: 'shi', start: '00:10:00', end: '00:10:30', role: '2' },
                { line: 2, syllableIndex: 2, syllable: 'jie', start: '00:10:30', end: '00:11:00', role: '2' }
            ];

            UIHandlers.updatePinyinTimestampsDisplay();

            const tbody = document.querySelector('#timestampsTable tbody');
            const rows = tbody.querySelectorAll('tr');

            expect(rows.length).toBe(4);

            // Line 1, syllable 1
            expect(rows[0].querySelectorAll('td')[0].textContent).toBe('1');
            expect(rows[0].querySelectorAll('td')[1].textContent).toBe('ni');

            // Line 1, syllable 2
            expect(rows[1].querySelectorAll('td')[0].textContent).toBe('1');
            expect(rows[1].querySelectorAll('td')[1].textContent).toBe('hao');

            // Line 2, syllable 1
            expect(rows[2].querySelectorAll('td')[0].textContent).toBe('2');
            expect(rows[2].querySelectorAll('td')[1].textContent).toBe('shi');
            expect(rows[2].querySelectorAll('td')[4].textContent).toBe('女聲');

            // Line 2, syllable 2
            expect(rows[3].querySelectorAll('td')[0].textContent).toBe('2');
            expect(rows[3].querySelectorAll('td')[1].textContent).toBe('jie');
            expect(rows[3].querySelectorAll('td')[4].textContent).toBe('女聲');
        });

        test('should display role name correctly for all roles', () => {
            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'a', start: '00:01:00', end: '00:01:10', role: '1' },
                { line: 1, syllableIndex: 2, syllable: 'b', start: '00:01:10', end: '00:01:20', role: '2' },
                { line: 1, syllableIndex: 3, syllable: 'c', start: '00:01:20', end: '00:01:30', role: '3' }
            ];

            UIHandlers.updatePinyinTimestampsDisplay();

            const tbody = document.querySelector('#timestampsTable tbody');
            const rows = tbody.querySelectorAll('tr');

            expect(rows[0].querySelectorAll('td')[4].textContent).toBe('男聲');
            expect(rows[1].querySelectorAll('td')[4].textContent).toBe('女聲');
            expect(rows[2].querySelectorAll('td')[4].textContent).toBe('合聲');
        });

        test('should clear table when pinyinTimestamps array is empty', () => {
            // Setup initial data
            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'test', start: '00:01:00', end: '00:01:30', role: '' }
            ];
            UIHandlers.updatePinyinTimestampsDisplay();

            // Clear pinyinTimestamps
            MakerState.pinyinTimestamps = [];
            UIHandlers.updatePinyinTimestampsDisplay();

            const tbody = document.querySelector('#timestampsTable tbody');
            expect(tbody.innerHTML).toBe('');
        });
    });

    // ============================================
    // Bug Regression: Table Column Mismatch
    // ============================================
    describe('Bug Regression: Table Column Order', () => {
        test('BUGFIX: pinyin table should NOT have 6 columns (was showing syllable in wrong position)', () => {
            // This test documents the bug that was fixed:
            // Before fix: 行|字|開始|結束|角色 table header, but data was: syllable|line|syllableIndex|start|end|role (6 cols)
            // After fix: Data matches header: line|syllable|start|end|role (5 cols)

            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'ko', start: '00:32:55', end: '00:33:02', role: '' }
            ];

            UIHandlers.updatePinyinTimestampsDisplay();

            const tbody = document.querySelector('#timestampsTable tbody');
            const row = tbody.querySelector('tr');
            const cells = row.querySelectorAll('td');

            // Should have exactly 5 columns to match table header
            expect(cells.length).toBe(5);

            // Column 0 should be line number (行), NOT syllable
            expect(cells[0].textContent).toBe('1');
            expect(cells[0].textContent).not.toBe('ko');

            // Column 1 should be syllable (字)
            expect(cells[1].textContent).toBe('ko');
        });

        test('BUGFIX: timestamps and pinyinTimestamps should have same column structure', () => {
            // Both functions should produce rows with the same structure:
            // 行 | 字 | 開始 | 結束 | 角色

            MakerState.timestamps = [
                { line: 1, wordIndex: 1, word: '你', start: '00:05:00', end: '00:05:50', role: '1' }
            ];
            UIHandlers.updateTimestampsTable();

            const timestampRow = document.querySelector('#timestampsTable tbody tr');
            const timestampCells = timestampRow.querySelectorAll('td');

            // Now test pinyin
            MakerState.pinyinTimestamps = [
                { line: 1, syllableIndex: 1, syllable: 'ni', start: '00:05:00', end: '00:05:50', role: '1' }
            ];
            UIHandlers.updatePinyinTimestampsDisplay();

            const pinyinRow = document.querySelector('#timestampsTable tbody tr');
            const pinyinCells = pinyinRow.querySelectorAll('td');

            // Both should have same number of columns
            expect(timestampCells.length).toBe(pinyinCells.length);
            expect(pinyinCells.length).toBe(5);

            // Column positions should be semantically equivalent
            // Col 0: line number
            expect(timestampCells[0].textContent).toBe(pinyinCells[0].textContent);
            // Col 2: start time
            expect(timestampCells[2].textContent).toBe(pinyinCells[2].textContent);
            // Col 3: end time
            expect(timestampCells[3].textContent).toBe(pinyinCells[3].textContent);
            // Col 4: role
            expect(timestampCells[4].textContent).toBe(pinyinCells[4].textContent);
        });
    });
});

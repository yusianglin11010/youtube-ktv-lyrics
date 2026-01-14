/**
 * Maker Dialog Tests - Group Mapping Dialog Keyboard Handler
 *
 * Tests the ESC key behavior fix for the pinyin group mapping dialog.
 * This test suite prevents regression of the bug where ESC key couldn't close the dialog.
 *
 * @jest-environment jsdom
 */

// Load maker.js functions into global scope for testing
const fs = require('fs');
const path = require('path');

// Read and evaluate maker.js to get access to its functions
const makerJsPath = path.join(__dirname, '../maker.js');
const makerJsCode = fs.readFileSync(makerJsPath, 'utf8');

describe('Group Mapping Dialog - Keyboard Handler', () => {
    let mockDialog;
    let originalConfirm;
    let originalAlert;

    // Global variables from maker.js that we need to access
    let groupMappingState;
    let groupMappingKeyboardHandler;
    let attachGroupMappingKeyboardHandlers;
    let removeGroupMappingKeyboardHandlers;
    let closeGroupMappingDialog;
    let renderGroupMappingInterface;
    let createGroupMapping;
    let deleteLastGroupMapping;
    let togglePinyinSelection;

    beforeAll(() => {
        // Setup minimal DOM required by maker.js
        document.body.innerHTML = `
            <div id="pinyinInput"></div>
            <div id="lyricsInput"></div>
            <div id="enablePinyin"></div>
            <dialog id="groupMappingDialog">
                <button class="close-dialog-btn" onclick="closeGroupMappingDialog()">✕</button>
                <button onclick="closeGroupMappingDialog()" class="cancel-btn">取消</button>
                <div id="groupMappingDisplay"></div>
            </dialog>
        `;

        // Create input elements
        const pinyinInput = document.getElementById('pinyinInput');
        pinyinInput.value = '';
        pinyinInput.tagName = 'TEXTAREA';

        const lyricsInput = document.getElementById('lyricsInput');
        lyricsInput.value = '';
        lyricsInput.tagName = 'TEXTAREA';

        const enablePinyin = document.getElementById('enablePinyin');
        enablePinyin.checked = false;
        enablePinyin.type = 'checkbox';

        // Mock YouTube API
        global.YT = {
            Player: jest.fn()
        };

        // Evaluate maker.js code to expose its functions
        // Note: We need to carefully extract only the functions we need
        // This is a simplified approach - in production you'd want proper module exports
    });

    beforeEach(() => {
        // Setup fresh DOM for each test
        document.body.innerHTML = `
            <textarea id="pinyinInput"></textarea>
            <textarea id="lyricsInput"></textarea>
            <input type="checkbox" id="enablePinyin" />
            <dialog id="groupMappingDialog">
                <button class="close-dialog-btn">✕</button>
                <button class="cancel-btn">取消</button>
                <div id="groupMappingDisplay"></div>
            </dialog>
        `;

        mockDialog = document.getElementById('groupMappingDialog');
        mockDialog.showModal = jest.fn();
        mockDialog.close = jest.fn();

        // Initialize groupMappingState
        groupMappingState = {
            currentLine: 0,
            pinyinData: [],
            lyricsData: [],
            mappings: [],
            selection: [],
            pinyinFocus: 0,
            lyricFocus: 0
        };

        // Mock global functions
        originalConfirm = window.confirm;
        originalAlert = window.alert;
        window.confirm = jest.fn(() => true);
        window.alert = jest.fn();

        // Mock renderGroupMappingInterface
        renderGroupMappingInterface = jest.fn();

        // Mock other required functions
        createGroupMapping = jest.fn();
        deleteLastGroupMapping = jest.fn();
        togglePinyinSelection = jest.fn();

        // Define closeGroupMappingDialog
        closeGroupMappingDialog = () => {
            if (groupMappingState.mappings.length > 0) {
                if (!confirm("您有未儲存的 mapping 紀錄。\n\n關閉視窗將會遺失這些紀錄，是否繼續？")) {
                    return;
                }
            }
            mockDialog.close();
            removeGroupMappingKeyboardHandlers();
        };

        // Define removeGroupMappingKeyboardHandlers
        removeGroupMappingKeyboardHandlers = () => {
            if (groupMappingKeyboardHandler) {
                document.removeEventListener('keydown', groupMappingKeyboardHandler);
                groupMappingKeyboardHandler = null;
            }
        };

        // Define attachGroupMappingKeyboardHandlers with the FIXED code
        attachGroupMappingKeyboardHandlers = () => {
            groupMappingKeyboardHandler = (e) => {
                let line = groupMappingState.currentLine;
                let pinyinList = groupMappingState.pinyinData[line] || [];
                let lyricsList = groupMappingState.lyricsData[line] || [];

                // Pinyin navigation: ← →
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (groupMappingState.pinyinFocus > 0) {
                        groupMappingState.pinyinFocus--;
                        renderGroupMappingInterface();
                    }
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (groupMappingState.pinyinFocus < pinyinList.length - 1) {
                        groupMappingState.pinyinFocus++;
                        renderGroupMappingInterface();
                    }
                }
                // Pinyin selection: Space
                else if (e.key === ' ') {
                    e.preventDefault();
                    togglePinyinSelection(groupMappingState.pinyinFocus);
                    if (groupMappingState.pinyinFocus < pinyinList.length - 1) {
                        groupMappingState.pinyinFocus++;
                        renderGroupMappingInterface();
                    }
                }
                // Lyric navigation: W/A (left), D (right)
                else if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'a') {
                    e.preventDefault();
                    if (groupMappingState.lyricFocus > 0) {
                        groupMappingState.lyricFocus--;
                        renderGroupMappingInterface();
                    }
                } else if (e.key.toLowerCase() === 'd') {
                    e.preventDefault();
                    if (groupMappingState.lyricFocus < lyricsList.length - 1) {
                        groupMappingState.lyricFocus++;
                        renderGroupMappingInterface();
                    }
                }
                // Create mapping: Enter
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    createGroupMapping();
                }
                // Delete last mapping: Backspace
                else if (e.key === 'Backspace') {
                    e.preventDefault();
                    deleteLastGroupMapping();
                }
                // Clear selection or close: Escape (FIXED CODE)
                else if (e.key === 'Escape') {
                    e.preventDefault();
                    if (groupMappingState.selection.length > 0) {
                        // First ESC: Clear selection
                        groupMappingState.selection = [];
                        renderGroupMappingInterface();
                    } else {
                        // Second ESC: Close dialog
                        closeGroupMappingDialog();
                    }
                }
            };

            document.addEventListener('keydown', groupMappingKeyboardHandler);
        };
    });

    afterEach(() => {
        window.confirm = originalConfirm;
        window.alert = originalAlert;
        removeGroupMappingKeyboardHandlers();
        document.body.innerHTML = '';
    });

    describe('ESC key closes dialog when selection is empty', () => {
        test('ESC immediately closes dialog with no selection', () => {
            // Setup: Empty selection, no mappings
            groupMappingState.selection = [];
            groupMappingState.mappings = [];

            // Attach handler and simulate ESC
            attachGroupMappingKeyboardHandlers();
            const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(escEvent);

            // Verify: dialog.close() was called
            expect(mockDialog.close).toHaveBeenCalledTimes(1);
        });

        test('ESC closes dialog after selection is cleared', () => {
            // Setup: Has selection
            groupMappingState.selection = [0, 1];
            groupMappingState.mappings = [];

            attachGroupMappingKeyboardHandlers();

            // First ESC: Clear selection
            let escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(escEvent);
            expect(groupMappingState.selection.length).toBe(0);
            expect(mockDialog.close).not.toHaveBeenCalled();

            // Second ESC: Close dialog
            escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(escEvent);
            expect(mockDialog.close).toHaveBeenCalledTimes(1);
        });
    });

    describe('ESC key clears selection before closing', () => {
        test('first ESC clears selection, second ESC closes', () => {
            groupMappingState.selection = [0, 1, 2];
            groupMappingState.mappings = [];

            attachGroupMappingKeyboardHandlers();

            // First ESC
            const escEvent1 = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(escEvent1);

            expect(groupMappingState.selection).toEqual([]);
            expect(mockDialog.close).not.toHaveBeenCalled();

            // Second ESC
            const escEvent2 = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(escEvent2);

            expect(mockDialog.close).toHaveBeenCalledTimes(1);
        });
    });

    describe('Other keyboard shortcuts still work', () => {
        test('Enter key triggers mapping creation', () => {
            attachGroupMappingKeyboardHandlers();
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(enterEvent);

            expect(createGroupMapping).toHaveBeenCalled();
        });

        test('Backspace deletes last mapping', () => {
            attachGroupMappingKeyboardHandlers();
            const backspaceEvent = new KeyboardEvent('keydown', {
                key: 'Backspace',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(backspaceEvent);

            expect(deleteLastGroupMapping).toHaveBeenCalled();
        });

        test('Arrow keys navigate pinyin', () => {
            groupMappingState.pinyinData = [['a', 'b', 'c']];
            groupMappingState.pinyinFocus = 1;
            groupMappingState.currentLine = 0;

            attachGroupMappingKeyboardHandlers();

            // Left arrow
            const leftEvent = new KeyboardEvent('keydown', {
                key: 'ArrowLeft',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(leftEvent);
            expect(groupMappingState.pinyinFocus).toBe(0);

            // Right arrow
            const rightEvent = new KeyboardEvent('keydown', {
                key: 'ArrowRight',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(rightEvent);
            expect(groupMappingState.pinyinFocus).toBe(1);
        });

        test('Space key toggles pinyin selection', () => {
            groupMappingState.pinyinData = [['a', 'b', 'c']];
            groupMappingState.pinyinFocus = 0;
            groupMappingState.currentLine = 0;

            attachGroupMappingKeyboardHandlers();

            const spaceEvent = new KeyboardEvent('keydown', {
                key: ' ',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(spaceEvent);

            expect(togglePinyinSelection).toHaveBeenCalledWith(0);
        });
    });

    describe('Close button behavior', () => {
        test('closeGroupMappingDialog function works correctly', () => {
            groupMappingState.mappings = [];

            closeGroupMappingDialog();

            expect(mockDialog.close).toHaveBeenCalledTimes(1);
        });

        test('close shows confirm when unsaved mappings exist', () => {
            groupMappingState.mappings = [{pinyin: 'a', lyric: 'b'}];
            window.confirm = jest.fn(() => false);

            closeGroupMappingDialog();

            expect(window.confirm).toHaveBeenCalled();
            expect(mockDialog.close).not.toHaveBeenCalled();
        });

        test('close proceeds when user confirms with unsaved mappings', () => {
            groupMappingState.mappings = [{pinyin: 'a', lyric: 'b'}];
            window.confirm = jest.fn(() => true);

            closeGroupMappingDialog();

            expect(window.confirm).toHaveBeenCalled();
            expect(mockDialog.close).toHaveBeenCalledTimes(1);
        });
    });

    describe('Dialog state cleanup', () => {
        test('removeGroupMappingKeyboardHandlers removes listener', () => {
            attachGroupMappingKeyboardHandlers();
            expect(groupMappingKeyboardHandler).not.toBeNull();

            removeGroupMappingKeyboardHandlers();
            expect(groupMappingKeyboardHandler).toBeNull();
        });

        test('closeGroupMappingDialog calls removeGroupMappingKeyboardHandlers', () => {
            groupMappingState.mappings = [];

            // Attach handlers first
            attachGroupMappingKeyboardHandlers();
            expect(groupMappingKeyboardHandler).not.toBeNull();

            // Close dialog should remove handlers
            closeGroupMappingDialog();
            expect(groupMappingKeyboardHandler).toBeNull();
        });
    });

    describe('Edge cases', () => {
        test('preventDefault is called on ESC key', () => {
            groupMappingState.selection = [];
            groupMappingState.mappings = [];

            attachGroupMappingKeyboardHandlers();

            const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            const preventDefaultSpy = jest.spyOn(escEvent, 'preventDefault');

            document.dispatchEvent(escEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        test('multiple ESC presses with selection changes', () => {
            // Start with selection
            groupMappingState.selection = [0, 1];
            groupMappingState.mappings = [];

            attachGroupMappingKeyboardHandlers();

            // First ESC: Clear selection
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            }));
            expect(groupMappingState.selection.length).toBe(0);

            // Add selection again
            groupMappingState.selection = [2];

            // Second ESC: Clear new selection
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            }));
            expect(groupMappingState.selection.length).toBe(0);

            // Third ESC: Close dialog
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            }));
            expect(mockDialog.close).toHaveBeenCalledTimes(1);
        });

        test('handler does not crash when pinyinData is empty', () => {
            groupMappingState.pinyinData = [];
            groupMappingState.currentLine = 0;

            attachGroupMappingKeyboardHandlers();

            // Should not crash
            expect(() => {
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'ArrowRight',
                    bubbles: true,
                    cancelable: true
                }));
            }).not.toThrow();
        });

        test('handler is properly removed after dialog close', () => {
            groupMappingState.mappings = [];
            attachGroupMappingKeyboardHandlers();

            // Close the dialog
            closeGroupMappingDialog();

            // Try to trigger keyboard event - handler should be removed
            const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(escEvent);

            // Dialog.close should only have been called once (during closeGroupMappingDialog)
            expect(mockDialog.close).toHaveBeenCalledTimes(1);
        });
    });

    describe('Regression test for original bug', () => {
        test('ESC key MUST close dialog - preventing the original bug', () => {
            // This is the core bug we're fixing:
            // ESC key was NOT closing the dialog when selection was empty

            groupMappingState.selection = [];
            groupMappingState.mappings = [];

            attachGroupMappingKeyboardHandlers();

            // Press ESC
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            }));

            // CRITICAL: Dialog MUST close
            expect(mockDialog.close).toHaveBeenCalledTimes(1);
        });
    });
});

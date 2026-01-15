/**
 * Constants Module Tests
 */

const Constants = require('./constants');

describe('Constants Module', () => {
    describe('ROLE_COLORS', () => {
        it('should have three role colors', () => {
            expect(Object.keys(Constants.ROLE_COLORS)).toHaveLength(3);
        });

        it('should have correct role color values', () => {
            expect(Constants.ROLE_COLORS['1']).toBe('#FF6B9D');
            expect(Constants.ROLE_COLORS['2']).toBe('#98FB98');
            expect(Constants.ROLE_COLORS['3']).toBe('#FFD700');
        });
    });

    describe('Default Style Constants', () => {
        it('should have correct default highlight color', () => {
            expect(Constants.DEFAULT_HIGHLIGHT_COLOR).toBe('#80D9E5');
        });

        it('should have correct default shadow color', () => {
            expect(Constants.DEFAULT_SHADOW_COLOR).toBe('#1D1B1B');
        });

        it('should have correct default font', () => {
            expect(Constants.DEFAULT_FONT).toBe('NotoSans');
        });

        it('should have correct default font size', () => {
            expect(Constants.DEFAULT_FONT_SIZE).toBe(40);
        });
    });

    describe('Animation Constants', () => {
        it('should have line advance threshold of 0.6 seconds', () => {
            expect(Constants.LINE_ADVANCE_THRESHOLD).toBe(0.6);
        });

        it('should have buffer circle gap of 4 seconds', () => {
            expect(Constants.BUFFER_CIRCLE_GAP).toBe(4);
        });

        it('should have pinyin font scale of 0.4', () => {
            expect(Constants.PINYIN_FONT_SCALE).toBe(0.4);
        });

        it('should have fast seek threshold of 0.5 seconds', () => {
            expect(Constants.FAST_SEEK_THRESHOLD).toBe(0.5);
        });
    });

    describe('End Message Constants', () => {
        it('should have end message delay of 1.5 seconds', () => {
            expect(Constants.END_MESSAGE_DELAY).toBe(1.5);
        });

        it('should have correct end messages', () => {
            expect(Constants.END_MESSAGE_UPPER).toBe('☆～來賓請掌聲鼓勵～☆');
            expect(Constants.END_MESSAGE_LOWER).toBe('☆～把酒同歡 歡樂無限～☆');
        });
    });

    describe('DEFAULT_SETTINGS', () => {
        it('should have all required properties', () => {
            expect(Constants.DEFAULT_SETTINGS).toHaveProperty('font');
            expect(Constants.DEFAULT_SETTINGS).toHaveProperty('fontSize');
            expect(Constants.DEFAULT_SETTINGS).toHaveProperty('highlightColor');
            expect(Constants.DEFAULT_SETTINGS).toHaveProperty('shadowColor');
            expect(Constants.DEFAULT_SETTINGS).toHaveProperty('timeOffset');
            expect(Constants.DEFAULT_SETTINGS).toHaveProperty('roleColors');
        });

        it('should use default constant values', () => {
            expect(Constants.DEFAULT_SETTINGS.font).toBe(Constants.DEFAULT_FONT);
            expect(Constants.DEFAULT_SETTINGS.fontSize).toBe(Constants.DEFAULT_FONT_SIZE);
            expect(Constants.DEFAULT_SETTINGS.highlightColor).toBe(Constants.DEFAULT_HIGHLIGHT_COLOR);
            expect(Constants.DEFAULT_SETTINGS.shadowColor).toBe(Constants.DEFAULT_SHADOW_COLOR);
        });

        it('should have timeOffset of 0', () => {
            expect(Constants.DEFAULT_SETTINGS.timeOffset).toBe(0);
        });

        it('should have roleColors matching ROLE_COLORS', () => {
            expect(Constants.DEFAULT_SETTINGS.roleColors).toEqual(Constants.ROLE_COLORS);
        });

        it('roleColors should be a copy, not the same reference', () => {
            expect(Constants.DEFAULT_SETTINGS.roleColors).not.toBe(Constants.ROLE_COLORS);
        });
    });
});

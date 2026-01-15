/**
 * Animation Utils Module Tests
 */

const AnimationUtils = require('./animation-utils');

describe('AnimationUtils Module', () => {
    describe('calculateProgress', () => {
        it('should return 0 when currentTime equals startTime', () => {
            const entry = { startTime: 10, endTime: 15 };
            expect(AnimationUtils.calculateProgress(entry, 10)).toBe(0);
        });

        it('should return 1 when currentTime equals endTime', () => {
            const entry = { startTime: 10, endTime: 15 };
            expect(AnimationUtils.calculateProgress(entry, 15)).toBe(1);
        });

        it('should return 0.5 when currentTime is at midpoint', () => {
            const entry = { startTime: 10, endTime: 20 };
            expect(AnimationUtils.calculateProgress(entry, 15)).toBe(0.5);
        });

        it('should return 0 when currentTime is before startTime', () => {
            const entry = { startTime: 10, endTime: 15 };
            expect(AnimationUtils.calculateProgress(entry, 5)).toBe(0);
        });

        it('should return 1 when currentTime is after endTime', () => {
            const entry = { startTime: 10, endTime: 15 };
            expect(AnimationUtils.calculateProgress(entry, 20)).toBe(1);
        });

        it('should return 1 when duration is zero', () => {
            const entry = { startTime: 10, endTime: 10 };
            expect(AnimationUtils.calculateProgress(entry, 10)).toBe(1);
        });

        it('should return 1 when duration is negative', () => {
            const entry = { startTime: 15, endTime: 10 };
            expect(AnimationUtils.calculateProgress(entry, 12)).toBe(1);
        });
    });

    describe('shouldAdvanceLine', () => {
        it('should return false when currentTime is before threshold', () => {
            expect(AnimationUtils.shouldAdvanceLine(10.5, 10)).toBe(false);
        });

        it('should return true when currentTime is at threshold', () => {
            expect(AnimationUtils.shouldAdvanceLine(10.6, 10)).toBe(true);
        });

        it('should return true when currentTime is after threshold', () => {
            expect(AnimationUtils.shouldAdvanceLine(11, 10)).toBe(true);
        });

        it('should use custom threshold', () => {
            expect(AnimationUtils.shouldAdvanceLine(10.8, 10, 1)).toBe(false);
            expect(AnimationUtils.shouldAdvanceLine(11.1, 10, 1)).toBe(true);
        });

        it('should use default threshold of 0.6 when not specified', () => {
            expect(AnimationUtils.shouldAdvanceLine(10.59, 10)).toBe(false);
            expect(AnimationUtils.shouldAdvanceLine(10.6, 10)).toBe(true);
        });
    });

    describe('detectFastSeek', () => {
        it('should return false for small time differences', () => {
            expect(AnimationUtils.detectFastSeek(10.3, 10)).toBe(false);
        });

        it('should return true for forward seek beyond threshold', () => {
            expect(AnimationUtils.detectFastSeek(11, 10)).toBe(true);
        });

        it('should return true for backward seek beyond threshold', () => {
            expect(AnimationUtils.detectFastSeek(9, 10)).toBe(true);
        });

        it('should use custom threshold', () => {
            expect(AnimationUtils.detectFastSeek(10.8, 10, 1)).toBe(false);
            expect(AnimationUtils.detectFastSeek(11.5, 10, 1)).toBe(true);
        });

        it('should use default threshold of 0.5', () => {
            expect(AnimationUtils.detectFastSeek(10.49, 10)).toBe(false);
            expect(AnimationUtils.detectFastSeek(10.51, 10)).toBe(true);
        });
    });

    describe('findCurrentEntryIndex', () => {
        const entries = [
            { startTime: 0, endTime: 5 },
            { startTime: 5, endTime: 10 },
            { startTime: 10, endTime: 15 },
            { startTime: 15, endTime: 20 }
        ];

        it('should find entry at beginning', () => {
            expect(AnimationUtils.findCurrentEntryIndex(entries, 2)).toBe(0);
        });

        it('should find entry in middle', () => {
            expect(AnimationUtils.findCurrentEntryIndex(entries, 7)).toBe(1);
            expect(AnimationUtils.findCurrentEntryIndex(entries, 12)).toBe(2);
        });

        it('should find entry at end', () => {
            expect(AnimationUtils.findCurrentEntryIndex(entries, 17)).toBe(3);
        });

        it('should return -1 when time is before all entries', () => {
            const laterEntries = [
                { startTime: 10, endTime: 15 },
                { startTime: 15, endTime: 20 }
            ];
            expect(AnimationUtils.findCurrentEntryIndex(laterEntries, 5)).toBe(-1);
        });

        it('should return -1 when time is after all entries', () => {
            expect(AnimationUtils.findCurrentEntryIndex(entries, 25)).toBe(-1);
        });

        it('should return -1 for empty array', () => {
            expect(AnimationUtils.findCurrentEntryIndex([], 10)).toBe(-1);
        });

        it('should return -1 for null/undefined', () => {
            expect(AnimationUtils.findCurrentEntryIndex(null, 10)).toBe(-1);
            expect(AnimationUtils.findCurrentEntryIndex(undefined, 10)).toBe(-1);
        });

        it('should handle exact boundary times (startTime inclusive)', () => {
            expect(AnimationUtils.findCurrentEntryIndex(entries, 5)).toBe(1);
            expect(AnimationUtils.findCurrentEntryIndex(entries, 10)).toBe(2);
        });

        it('should handle exact boundary times (endTime exclusive)', () => {
            // At exactly endTime, entry is not found (endTime is exclusive)
            const result = AnimationUtils.findCurrentEntryIndex(entries, 5);
            // At time 5, entry 1 (5-10) should be found
            expect(result).toBe(1);
        });
    });

    describe('findNearestEntry', () => {
        const entries = [
            { startTime: 5, endTime: 10 },
            { startTime: 10, endTime: 15 },
            { startTime: 20, endTime: 25 }
        ];

        it('should find current playing entry', () => {
            const result = AnimationUtils.findNearestEntry(entries, 7);
            expect(result).toEqual(entries[0]);
        });

        it('should find next entry when between entries', () => {
            const result = AnimationUtils.findNearestEntry(entries, 17);
            expect(result).toEqual(entries[2]);
        });

        it('should find next entry when before all entries', () => {
            const result = AnimationUtils.findNearestEntry(entries, 2);
            expect(result).toEqual(entries[0]);
        });

        it('should return last entry when after all entries', () => {
            const result = AnimationUtils.findNearestEntry(entries, 30);
            expect(result).toEqual(entries[2]);
        });

        it('should return null for empty array', () => {
            expect(AnimationUtils.findNearestEntry([], 10)).toBeNull();
        });

        it('should return null for null/undefined', () => {
            expect(AnimationUtils.findNearestEntry(null, 10)).toBeNull();
            expect(AnimationUtils.findNearestEntry(undefined, 10)).toBeNull();
        });
    });

    describe('createGradientStyle', () => {
        it('should create gradient with default base color', () => {
            const result = AnimationUtils.createGradientStyle('#FF0000');
            expect(result).toBe('linear-gradient(90deg, #FF0000 0%, #FF0000 50%, white 50%, white 100%)');
        });

        it('should create gradient with custom base color', () => {
            const result = AnimationUtils.createGradientStyle('#FF0000', '#000000');
            expect(result).toBe('linear-gradient(90deg, #FF0000 0%, #FF0000 50%, #000000 50%, #000000 100%)');
        });
    });

    describe('calculateBackgroundPosition', () => {
        it('should return 100 for progress 0', () => {
            expect(AnimationUtils.calculateBackgroundPosition(0)).toBe(100);
        });

        it('should return 0 for progress 1', () => {
            expect(AnimationUtils.calculateBackgroundPosition(1)).toBe(0);
        });

        it('should return 50 for progress 0.5', () => {
            expect(AnimationUtils.calculateBackgroundPosition(0.5)).toBe(50);
        });

        it('should return 75 for progress 0.25', () => {
            expect(AnimationUtils.calculateBackgroundPosition(0.25)).toBe(75);
        });
    });

    describe('applyAnimationToElement', () => {
        it('should set backgroundPosition style', () => {
            const element = { style: {} };
            const entry = { startTime: 0, endTime: 10 };

            AnimationUtils.applyAnimationToElement(element, entry, 5);

            expect(element.style.backgroundPosition).toBe('50% 0');
        });

        it('should set backgroundPosition to 0% for completed animation', () => {
            const element = { style: {} };
            const entry = { startTime: 0, endTime: 10 };

            AnimationUtils.applyAnimationToElement(element, entry, 10);

            expect(element.style.backgroundPosition).toBe('0% 0');
        });

        it('should set backgroundPosition to 100% for not started animation', () => {
            const element = { style: {} };
            const entry = { startTime: 5, endTime: 10 };

            AnimationUtils.applyAnimationToElement(element, entry, 0);

            expect(element.style.backgroundPosition).toBe('100% 0');
        });
    });

    describe('initGradientAnimation', () => {
        it('should initialize element with gradient styles', () => {
            const element = { style: {} };

            AnimationUtils.initGradientAnimation(element, '#FF0000');

            expect(element.style.background).toContain('linear-gradient');
            expect(element.style.background).toContain('#FF0000');
            expect(element.style.backgroundSize).toBe('200% 100%');
            expect(element.style.backgroundPosition).toBe('100% 0');
            expect(element.style.backgroundClip).toBe('text');
            expect(element.style.webkitBackgroundClip).toBe('text');
            expect(element.style.webkitTextFillColor).toBe('transparent');
            expect(element.style.color).toBe('transparent');
            expect(element.style.textShadow).toBe('none');
        });

        it('should use custom base color', () => {
            const element = { style: {} };

            AnimationUtils.initGradientAnimation(element, '#FF0000', '#000000');

            expect(element.style.background).toContain('#000000');
        });
    });
});

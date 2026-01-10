/**
 * Subtitle Parser Module Tests
 * 字幕解析模組測試
 */

const SubtitleParser = require('../lib/subtitle-parser.js');

describe('SubtitleParser', () => {
    describe('timeToSeconds', () => {
        test('should convert 00:00:00 to 0', () => {
            expect(SubtitleParser.timeToSeconds('00:00:00')).toBe(0);
        });

        test('should convert 01:00:00 to 60', () => {
            expect(SubtitleParser.timeToSeconds('01:00:00')).toBe(60);
        });

        test('should convert 00:30:00 to 30', () => {
            expect(SubtitleParser.timeToSeconds('00:30:00')).toBe(30);
        });

        test('should convert 00:00:50 to 0.5 (centiseconds)', () => {
            expect(SubtitleParser.timeToSeconds('00:00:50')).toBe(0.5);
        });

        test('should convert 02:30:75 to 150.75', () => {
            expect(SubtitleParser.timeToSeconds('02:30:75')).toBe(150.75);
        });

        test('should convert 00:18:98 to 18.98', () => {
            expect(SubtitleParser.timeToSeconds('00:18:98')).toBe(18.98);
        });

        test('should throw error for invalid format', () => {
            expect(() => SubtitleParser.timeToSeconds('00:00')).toThrow('Invalid time format');
        });
    });

    describe('extractVideoId', () => {
        test('should extract ID from standard YouTube URL', () => {
            expect(SubtitleParser.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
                .toBe('dQw4w9WgXcQ');
        });

        test('should extract ID from short YouTube URL', () => {
            expect(SubtitleParser.extractVideoId('https://youtu.be/dQw4w9WgXcQ'))
                .toBe('dQw4w9WgXcQ');
        });

        test('should extract ID from URL with additional parameters', () => {
            expect(SubtitleParser.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'))
                .toBe('dQw4w9WgXcQ');
        });

        test('should extract ID from URL without https', () => {
            expect(SubtitleParser.extractVideoId('www.youtube.com/watch?v=dQw4w9WgXcQ'))
                .toBe('dQw4w9WgXcQ');
        });

        test('should extract ID from embed URL', () => {
            expect(SubtitleParser.extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'))
                .toBe('dQw4w9WgXcQ');
        });

        test('should return null for invalid URL', () => {
            expect(SubtitleParser.extractVideoId('https://example.com/video')).toBeNull();
        });

        test('should return null for null input', () => {
            expect(SubtitleParser.extractVideoId(null)).toBeNull();
        });

        test('should return null for undefined input', () => {
            expect(SubtitleParser.extractVideoId(undefined)).toBeNull();
        });

        test('should return null for empty string', () => {
            expect(SubtitleParser.extractVideoId('')).toBeNull();
        });
    });

    describe('parseSubtitleLine', () => {
        test('should parse a valid subtitle line', () => {
            const line = 'Line 1 | Word 1 | 00:05:23 → 00:05:50 | 昨';
            const result = SubtitleParser.parseSubtitleLine(line);

            expect(result).toEqual({
                line: 1,
                wordIndex: 1,
                startTime: 5.23,
                endTime: 5.50,
                word: '昨',
                pinyin: null
            });
        });

        test('should parse a subtitle line with pinyin', () => {
            const line = 'Line 1 | Word 1 | 00:27:11 → 00:27:58 | 미 | mi';
            const result = SubtitleParser.parseSubtitleLine(line);

            expect(result).toEqual({
                line: 1,
                wordIndex: 1,
                startTime: 27.11,
                endTime: 27.58,
                word: '미',
                pinyin: 'mi'
            });
        });

        test('should parse pinyin with trailing space', () => {
            const line = 'Line 1 | Word 2 | 00:27:58 → 00:28:19 | 치 | chi ';
            const result = SubtitleParser.parseSubtitleLine(line);

            expect(result.word).toBe('치');
            expect(result.pinyin).toBe('chi');
        });

        test('should parse pinyin for English words', () => {
            const line = 'Line 8 | Word 4 | 01:09:55 → 01:10:55 | drowning | drowning';
            const result = SubtitleParser.parseSubtitleLine(line);

            expect(result.word).toBe('drowning');
            expect(result.pinyin).toBe('drowning');
        });

        test('should parse line with spaces and convert to markers', () => {
            const line = 'Line 2 | Word 3 | 00:10:00 → 00:10:50 | Hello World';
            const result = SubtitleParser.parseSubtitleLine(line);

            expect(result.word).toBe('Hello␣World');
        });

        test('should parse line with full-width spaces', () => {
            const line = 'Line 1 | Word 1 | 00:05:00 → 00:06:00 | 你　好';
            const result = SubtitleParser.parseSubtitleLine(line);

            expect(result.word).toBe('你␣␣好');
        });

        test('should parse multi-digit line and word numbers', () => {
            const line = 'Line 15 | Word 23 | 03:45:67 → 03:46:89 | 字';
            const result = SubtitleParser.parseSubtitleLine(line);

            expect(result.line).toBe(15);
            expect(result.wordIndex).toBe(23);
            expect(result.startTime).toBe(225.67);
            expect(result.endTime).toBe(226.89);
        });

        test('should return null for invalid line format', () => {
            expect(SubtitleParser.parseSubtitleLine('Invalid line')).toBeNull();
            expect(SubtitleParser.parseSubtitleLine('')).toBeNull();
            expect(SubtitleParser.parseSubtitleLine('Line 1 Word 1')).toBeNull();
        });
    });

    describe('parseSubtitleFile', () => {
        // 使用開始時間 < 4 秒的測試檔案，避免觸發緩衝圓點
        const validSubtitleFile = `測試歌曲
https://www.youtube.com/watch?v=dQw4w9WgXcQ

Line 1 | Word 1 | 00:01:00 → 00:01:50 | 你
Line 1 | Word 2 | 00:01:50 → 00:02:20 | 好
Line 2 | Word 1 | 00:03:00 → 00:03:50 | 世
Line 2 | Word 2 | 00:03:50 → 00:04:20 | 界`;

        test('should parse a valid subtitle file', () => {
            const result = SubtitleParser.parseSubtitleFile(validSubtitleFile);

            expect(result.error).toBeUndefined();
            expect(result.videoId).toBe('dQw4w9WgXcQ');
            expect(result.title).toBe('測試歌曲');
            expect(result.data.length).toBe(4);
        });

        test('should correctly parse subtitle entries', () => {
            const result = SubtitleParser.parseSubtitleFile(validSubtitleFile);

            expect(result.data[0]).toEqual({
                line: 1,
                wordIndex: 1,
                startTime: 1.0,
                endTime: 1.5,
                word: '你',
                pinyin: null
            });
        });

        test('should detect #PINYIN_ENABLED marker', () => {
            const pinyinFile = `韓文歌曲
https://www.youtube.com/watch?v=ZFB0hroV3jw
#PINYIN_ENABLED

Line 1 | Word 1 | 00:01:00 → 00:01:50 | 미 | mi
Line 1 | Word 2 | 00:01:50 → 00:02:20 | 치 | chi`;

            const result = SubtitleParser.parseSubtitleFile(pinyinFile);

            expect(result.error).toBeUndefined();
            expect(result.hasPinyin).toBe(true);
            expect(result.data[0].word).toBe('미');
            expect(result.data[0].pinyin).toBe('mi');
            expect(result.data[1].pinyin).toBe('chi');
        });

        test('should set hasPinyin to false when marker is missing', () => {
            const result = SubtitleParser.parseSubtitleFile(validSubtitleFile);
            expect(result.hasPinyin).toBe(false);
        });

        test('should insert buffer circles when first entry starts after 4 seconds', () => {
            const fileWithDelay = `延遲測試
https://www.youtube.com/watch?v=test12345678

Line 1 | Word 1 | 00:10:00 → 00:10:50 | 開`;

            const result = SubtitleParser.parseSubtitleFile(fileWithDelay);

            // Should have circles (2 entries) + original (1 entry) = 3 entries
            expect(result.data.length).toBe(3);
            expect(result.data[0].word).toBe('•••');
            expect(result.data[0].startTime).toBe(7); // 10 - 3 = 7
            expect(result.data[0].endTime).toBe(10);
        });

        test('should insert buffer circles for long gaps between lines', () => {
            const fileWithGap = `間隔測試
https://www.youtube.com/watch?v=test12345678

Line 1 | Word 1 | 00:02:00 → 00:03:00 | 第一
Line 2 | Word 1 | 00:10:00 → 00:11:00 | 第二`;

            const result = SubtitleParser.parseSubtitleFile(fileWithGap);

            // Line 1: 1 entry, Line 2: 2 circles + 1 original = 4 total
            expect(result.data.length).toBe(4);

            // Find the circles for line 2
            const line2Circles = result.data.filter(e => e.line === 2 && e.word === '•••');
            expect(line2Circles.length).toBe(1);
            expect(line2Circles[0].startTime).toBe(7); // 10 - 3 = 7
        });

        test('should not insert circles when gap is less than 4 seconds', () => {
            const fileWithSmallGap = `短間隔測試
https://www.youtube.com/watch?v=test12345678

Line 1 | Word 1 | 00:02:00 → 00:03:00 | 第一
Line 2 | Word 1 | 00:05:00 → 00:06:00 | 第二`;

            const result = SubtitleParser.parseSubtitleFile(fileWithSmallGap);

            // No circles should be inserted (gap is only 2 seconds)
            expect(result.data.length).toBe(2);
            expect(result.data.filter(e => e.word === '•••').length).toBe(0);
        });

        test('should return error for empty input', () => {
            expect(SubtitleParser.parseSubtitleFile('')).toEqual({ error: '字幕檔案內容為空' });
            expect(SubtitleParser.parseSubtitleFile(null)).toEqual({ error: '字幕檔案內容為空' });
        });

        test('should return error for file with less than 3 lines', () => {
            const shortFile = `標題
https://www.youtube.com/watch?v=dQw4w9WgXcQ`;

            const result = SubtitleParser.parseSubtitleFile(shortFile);
            expect(result.error).toBe('字幕檔案格式錯誤：至少需要標題、URL 和一行字幕');
        });

        test('should return error for invalid video URL', () => {
            const invalidUrlFile = `標題
https://example.com/video

Line 1 | Word 1 | 00:05:00 → 00:05:50 | 字`;

            const result = SubtitleParser.parseSubtitleFile(invalidUrlFile);
            expect(result.error).toBe('無法從字幕檔案中提取有效的 YouTube 影片 ID');
        });

        test('should return error when no subtitle lines can be parsed', () => {
            const noValidLines = `標題
https://www.youtube.com/watch?v=dQw4w9WgXcQ

這不是有效的字幕行
這也不是`;

            const result = SubtitleParser.parseSubtitleFile(noValidLines);
            expect(result.error).toBe('無法解析任何字幕內容');
        });

        test('should skip invalid lines and continue parsing', () => {
            // 使用開始時間 < 4 秒，避免觸發緩衝圓點
            const mixedFile = `混合測試
https://www.youtube.com/watch?v=dQw4w9WgXcQ

這是無效行
Line 1 | Word 1 | 00:01:00 → 00:01:50 | 有效
另一個無效行
Line 1 | Word 2 | 00:01:50 → 00:02:20 | 字`;

            const result = SubtitleParser.parseSubtitleFile(mixedFile);

            expect(result.error).toBeUndefined();
            expect(result.data.length).toBe(2);
        });
    });

    describe('validateSubtitleFile', () => {
        test('should return valid for correct file', () => {
            const validFile = `標題
https://www.youtube.com/watch?v=dQw4w9WgXcQ

Line 1 | Word 1 | 00:05:00 → 00:05:50 | 字`;

            const result = SubtitleParser.validateSubtitleFile(validFile);

            expect(result.valid).toBe(true);
            expect(result.videoId).toBe('dQw4w9WgXcQ');
            expect(result.lineCount).toBeGreaterThan(0);
        });

        test('should return invalid with error message for bad file', () => {
            const result = SubtitleParser.validateSubtitleFile('');

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});

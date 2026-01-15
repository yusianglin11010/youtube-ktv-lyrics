/**
 * YouTube KTV Lyrics - Maker Entry Point
 * 入口檔案，協調各模組並暴露全域 API
 */

(function() {
    'use strict';

    // 全域狀態（供各模組共享）
    window.MakerState = {
        // 歌詞相關
        lyrics: [],
        pinyinLyrics: [],
        pinyinEnabled: false,
        totalWordsInSong: 0,

        // 索引追蹤
        currentWordIndex: 0,
        currentLineIndex: 0,

        // 時間戳記
        timestamps: [],
        pinyinTimestamps: [],

        // 工作流程
        workflowPhase: 'INPUT',  // 'INPUT' | 'SYNC_PINYIN' | 'MAPPING' | 'COMPLETE'
        pinyinToLyricMappings: [],

        // UI 狀態
        currentRole: ''
    };

    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
        UIHandlers.setupKeyboardHandlers();
    });

    // 暴露給 HTML onclick 的函數
    window.loadVideo = function() {
        VideoController.loadVideo();
    };

    window.loadLyrics = function() {
        LyricsProcessor.loadLyrics();
    };

    window.validateAlignment = function() {
        LyricsProcessor.validateAlignment();
    };

    window.nextChar = function() {
        SyncRecorder.nextChar();
    };

    window.nextLine = function() {
        SyncRecorder.nextLine();
    };

    window.prevLine = function() {
        SyncRecorder.prevLine();
    };

    window.restartCurrentLine = function() {
        SyncRecorder.restartCurrentLine();
    };

    window.resetAll = function() {
        SyncRecorder.resetAll();
    };

    window.setRole = function(role) {
        UIHandlers.setRole(role);
    };

    window.toggleHelp = function() {
        UIHandlers.toggleHelp();
    };

    window.toggleTimestampDetails = function() {
        UIHandlers.toggleTimestampDetails();
    };

    window.exportTimestamps = function() {
        Export.exportTimestamps();
    };

    window.openGroupMappingDialog = function() {
        GroupMapping.openDialog();
    };

    window.closeGroupMappingDialog = function() {
        GroupMapping.closeDialog();
    };

    window.nextGroupMappingLine = function() {
        GroupMapping.nextLine();
    };

    window.prevGroupMappingLine = function() {
        GroupMapping.prevLine();
    };

    window.saveGroupMappings = function() {
        GroupMapping.save();
    };

    window.deleteGroupMapping = function(idx) {
        GroupMapping.deleteMapping(idx);
    };

})();

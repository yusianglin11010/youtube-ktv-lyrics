/**
 * YouTube KTV Lyrics Extension - Options Page Script
 */

(function() {
    'use strict';

    // DOM 元素
    const elements = {
        subtitleCount: document.getElementById('subtitleCount'),
        storageUsed: document.getElementById('storageUsed'),
        storagePercentage: document.getElementById('storagePercentage'),
        searchInput: document.getElementById('searchInput'),
        clearSearch: document.getElementById('clearSearch'),
        deleteSelected: document.getElementById('deleteSelected'),
        selectedCount: document.getElementById('selectedCount'),
        deleteAll: document.getElementById('deleteAll'),
        selectAll: document.getElementById('selectAll'),
        subtitleList: document.getElementById('subtitleList'),
        emptyState: document.getElementById('emptyState'),
        noResults: document.getElementById('noResults'),
        confirmDialog: document.getElementById('confirmDialog'),
        dialogTitle: document.getElementById('dialogTitle'),
        dialogMessage: document.getElementById('dialogMessage'),
        dialogCancel: document.getElementById('dialogCancel'),
        dialogConfirm: document.getElementById('dialogConfirm')
    };

    // 狀態
    let allSubtitles = [];
    let filteredSubtitles = [];
    let selectedIds = new Set();
    let pendingAction = null;

    /**
     * 初始化
     */
    async function init() {
        await loadSubtitles();
        await updateStorageStats();
        bindEvents();
    }

    /**
     * 載入字幕列表
     */
    async function loadSubtitles() {
        try {
            const result = await chrome.storage.local.get('subtitleIndex');
            allSubtitles = result.subtitleIndex || [];
            filteredSubtitles = [...allSubtitles];
            renderList();
            updateStats();
        } catch (error) {
            console.error('Failed to load subtitles:', error);
        }
    }

    /**
     * 更新儲存統計
     */
    async function updateStorageStats() {
        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse(null);
            const totalBytes = 5 * 1024 * 1024; // 5MB
            const percentage = Math.round((bytesInUse / totalBytes) * 100);

            elements.storageUsed.textContent = formatBytes(bytesInUse);
            elements.storagePercentage.textContent = `${percentage}%`;
        } catch (error) {
            console.error('Failed to get storage stats:', error);
        }
    }

    /**
     * 格式化位元組
     */
    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * 更新統計數字
     */
    function updateStats() {
        elements.subtitleCount.textContent = allSubtitles.length;
    }

    /**
     * 渲染列表
     */
    function renderList() {
        const tbody = elements.subtitleList;
        tbody.innerHTML = '';

        // 顯示空狀態
        if (allSubtitles.length === 0) {
            elements.emptyState.classList.remove('hidden');
            elements.noResults.classList.add('hidden');
            return;
        }

        elements.emptyState.classList.add('hidden');

        // 顯示無結果
        if (filteredSubtitles.length === 0) {
            elements.noResults.classList.remove('hidden');
            return;
        }

        elements.noResults.classList.add('hidden');

        // 渲染每一行
        filteredSubtitles.forEach(subtitle => {
            const row = createRow(subtitle);
            tbody.appendChild(row);
        });

        // 更新全選狀態
        updateSelectAllState();
    }

    /**
     * 建立表格行
     */
    function createRow(subtitle) {
        const tr = document.createElement('tr');
        tr.dataset.videoId = subtitle.videoId;

        const isSelected = selectedIds.has(subtitle.videoId);

        tr.innerHTML = `
            <td class="col-checkbox">
                <input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''}>
            </td>
            <td class="col-title">${escapeHtml(subtitle.title)}</td>
            <td class="col-videoid">
                <a href="https://www.youtube.com/watch?v=${subtitle.videoId}"
                   target="_blank"
                   class="video-id-link">${subtitle.videoId}</a>
            </td>
            <td class="col-date">
                <span class="date-text">${formatDate(subtitle.uploadedAt)}</span>
            </td>
            <td class="col-actions">
                <button class="btn btn-danger btn-sm delete-btn">刪除</button>
            </td>
        `;

        // 綁定事件
        const checkbox = tr.querySelector('.row-checkbox');
        checkbox.addEventListener('change', () => handleRowSelect(subtitle.videoId, checkbox.checked));

        const deleteBtn = tr.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => showDeleteConfirm([subtitle.videoId]));

        return tr;
    }

    /**
     * HTML 轉義
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 格式化日期
     */
    function formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * 綁定事件
     */
    function bindEvents() {
        // 搜尋
        elements.searchInput.addEventListener('input', handleSearch);
        elements.clearSearch.addEventListener('click', clearSearch);

        // 全選
        elements.selectAll.addEventListener('change', handleSelectAll);

        // 刪除
        elements.deleteSelected.addEventListener('click', () => {
            showDeleteConfirm(Array.from(selectedIds));
        });
        elements.deleteAll.addEventListener('click', () => {
            showDeleteConfirm(allSubtitles.map(s => s.videoId), true);
        });

        // 對話框
        elements.dialogCancel.addEventListener('click', hideDialog);
        elements.dialogConfirm.addEventListener('click', handleDialogConfirm);
        elements.confirmDialog.addEventListener('click', (e) => {
            if (e.target === elements.confirmDialog) {
                hideDialog();
            }
        });
    }

    /**
     * 處理搜尋
     */
    function handleSearch() {
        const query = elements.searchInput.value.trim().toLowerCase();

        if (!query) {
            filteredSubtitles = [...allSubtitles];
        } else {
            filteredSubtitles = allSubtitles.filter(subtitle =>
                subtitle.title.toLowerCase().includes(query) ||
                subtitle.videoId.toLowerCase().includes(query)
            );
        }

        renderList();
    }

    /**
     * 清除搜尋
     */
    function clearSearch() {
        elements.searchInput.value = '';
        filteredSubtitles = [...allSubtitles];
        renderList();
    }

    /**
     * 處理行選擇
     */
    function handleRowSelect(videoId, isSelected) {
        if (isSelected) {
            selectedIds.add(videoId);
        } else {
            selectedIds.delete(videoId);
        }

        updateSelectedCount();
        updateSelectAllState();
    }

    /**
     * 處理全選
     */
    function handleSelectAll() {
        const isChecked = elements.selectAll.checked;

        filteredSubtitles.forEach(subtitle => {
            if (isChecked) {
                selectedIds.add(subtitle.videoId);
            } else {
                selectedIds.delete(subtitle.videoId);
            }
        });

        // 更新所有 checkbox
        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = isChecked;
        });

        updateSelectedCount();
    }

    /**
     * 更新全選狀態
     */
    function updateSelectAllState() {
        const allSelected = filteredSubtitles.length > 0 &&
            filteredSubtitles.every(s => selectedIds.has(s.videoId));
        elements.selectAll.checked = allSelected;
    }

    /**
     * 更新已選數量
     */
    function updateSelectedCount() {
        const count = selectedIds.size;
        elements.selectedCount.textContent = count;
        elements.deleteSelected.disabled = count === 0;
    }

    /**
     * 顯示刪除確認
     */
    function showDeleteConfirm(videoIds, isDeleteAll = false) {
        if (videoIds.length === 0) return;

        pendingAction = { type: 'delete', videoIds };

        if (isDeleteAll) {
            elements.dialogTitle.textContent = '清空全部';
            elements.dialogMessage.textContent = `確定要刪除全部 ${videoIds.length} 首歌曲嗎？此操作無法復原。`;
        } else if (videoIds.length === 1) {
            const subtitle = allSubtitles.find(s => s.videoId === videoIds[0]);
            elements.dialogTitle.textContent = '確認刪除';
            elements.dialogMessage.textContent = `確定要刪除「${subtitle?.title || videoIds[0]}」嗎？`;
        } else {
            elements.dialogTitle.textContent = '確認刪除';
            elements.dialogMessage.textContent = `確定要刪除選取的 ${videoIds.length} 首歌曲嗎？`;
        }

        elements.confirmDialog.classList.remove('hidden');
    }

    /**
     * 隱藏對話框
     */
    function hideDialog() {
        elements.confirmDialog.classList.add('hidden');
        pendingAction = null;
    }

    /**
     * 處理對話框確認
     */
    async function handleDialogConfirm() {
        if (!pendingAction || pendingAction.type !== 'delete') {
            hideDialog();
            return;
        }

        const videoIds = pendingAction.videoIds;
        hideDialog();

        try {
            // 刪除字幕資料
            const keysToRemove = videoIds.map(id => `subtitle_${id}`);
            await chrome.storage.local.remove(keysToRemove);

            // 更新索引
            allSubtitles = allSubtitles.filter(s => !videoIds.includes(s.videoId));
            await chrome.storage.local.set({ subtitleIndex: allSubtitles });

            // 清除已選
            videoIds.forEach(id => selectedIds.delete(id));

            // 重新渲染
            handleSearch();
            updateStats();
            updateSelectedCount();
            await updateStorageStats();
        } catch (error) {
            console.error('Failed to delete subtitles:', error);
            alert('刪除失敗，請重試');
        }
    }

    // 初始化
    init();
})();

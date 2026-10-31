// Viewing history page. Shared helpers live in pages-common.js.

let lastHistoryJSON = null;

function loadHistory() {
    browserAPI.storage.local.get(['museumArtHistory'], (result) => {
        displayHistory(result.museumArtHistory || []);
    });
}

function displayHistory(history) {
    // Skip rebuilding (and re-fetching thumbnails) when nothing changed.
    const json = JSON.stringify(history);
    if (json === lastHistoryJSON) return;
    lastHistoryJSON = json;

    const emptyHistory = document.getElementById('emptyHistory');
    const historyTable = document.getElementById('historyTable');
    const historyTableBody = document.getElementById('historyTableBody');

    document.getElementById('exportHistoryBtn').disabled = history.length === 0;
    historyTableBody.innerHTML = '';
    if (history.length === 0) {
        emptyHistory.style.display = 'block';
        historyTable.style.display = 'none';
        return;
    }

    emptyHistory.style.display = 'none';
    historyTable.style.display = 'table';
    history.forEach((item) => {
        historyTableBody.appendChild(buildArtworkRow(item, { showTime: true }));
    });
}

document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your viewing history?')) {
        browserAPI.storage.local.set({ museumArtHistory: [] }, () => {
            loadHistory();
            showStatus('status');
        });
    }
});

document.getElementById('exportHistoryBtn').addEventListener('click', () => {
    browserAPI.storage.local.get(['museumArtHistory'], (result) => {
        exportJSON('new-tab-new-art-history', result.museumArtHistory || []);
    });
});

function loadHistoryLimit() {
    browserAPI.storage.local.get({ historyLimit: 10 }, (result) => {
        document.getElementById('historyLimitText').textContent = result.historyLimit || 10;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    loadHistoryLimit();
    loadHistory();
    // Refresh in case history changes from another tab
    setInterval(loadHistory, 3000);
});

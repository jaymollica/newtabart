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

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    loadHistory();
    // Refresh in case history changes from another tab
    setInterval(loadHistory, 3000);
});

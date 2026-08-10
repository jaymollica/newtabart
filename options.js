// Default settings
const defaultSettings = {
    enableWhitney: true,
    enableAIC: true,
    enableCleveland: true,
    enableMet: true,
    enableWikimedia: false,
    darkMode: 'auto' // 'off', 'on', or 'auto'
};

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Dark mode functions
function isDarkModePreferred() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkMode(darkModeSetting) {
    let shouldBeDark = false;
    
    if (darkModeSetting === 'on') {
        shouldBeDark = true;
    } else if (darkModeSetting === 'auto') {
        shouldBeDark = isDarkModePreferred();
    }
    
    if (shouldBeDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Load saved settings
browserAPI.storage.local.get(defaultSettings, (result) => {
    document.getElementById('enableWhitney').checked = result.enableWhitney;
    document.getElementById('enableAIC').checked = result.enableAIC;
    document.getElementById('enableCleveland').checked = result.enableCleveland;
    document.getElementById('enableMet').checked = result.enableMet;
    document.getElementById('enableWikimedia').checked = result.enableWikimedia;
    
    // Set dark mode radio button
    const darkMode = result.darkMode || 'auto';
    document.getElementById('darkModeOff').checked = (darkMode === 'off');
    document.getElementById('darkModeOn').checked = (darkMode === 'on');
    document.getElementById('darkModeAuto').checked = (darkMode === 'auto');
    
    // Apply dark mode to settings page
    applyDarkMode(darkMode);
});

// Get all checkboxes
const checkboxes = [
    document.getElementById('enableWhitney'),
    document.getElementById('enableAIC'),
    document.getElementById('enableCleveland'),
    document.getElementById('enableMet'),
    document.getElementById('enableWikimedia')
];

// Save settings when any checkbox changes
checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // Check if at least one is enabled
        const anyEnabled = checkboxes.some(cb => cb.checked);
        
        if (!anyEnabled) {
            // Prevent disabling all sources
            checkbox.checked = true;
            showWarning();
            return;
        }

        saveSettings();
    });
});

// Dark mode radio button listeners
document.querySelectorAll('input[name="darkMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
        saveSettings();
        applyDarkMode(radio.value);
    });
});

function saveSettings() {
    const settings = {
        enableWhitney: document.getElementById('enableWhitney').checked,
        enableAIC: document.getElementById('enableAIC').checked,
        enableCleveland: document.getElementById('enableCleveland').checked,
        enableMet: document.getElementById('enableMet').checked,
        enableWikimedia: document.getElementById('enableWikimedia').checked,
        darkMode: document.querySelector('input[name="darkMode"]:checked').value
    };

    browserAPI.storage.local.set(settings, () => {
        showStatus();
    });
}

function showStatus() {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
    }, 2000);
}

function showWarning() {
    const warning = document.getElementById('warning');
    warning.style.display = 'block';
    setTimeout(() => {
        warning.style.display = 'none';
    }, 3000);
}

// History Management
function loadHistory() {
    browserAPI.storage.local.get(['museumArtHistory'], (result) => {
        const history = result.museumArtHistory || [];
        displayHistory(history);
    });
}

function displayHistory(history) {
    const emptyHistory = document.getElementById('emptyHistory');
    const historyTable = document.getElementById('historyTable');
    const historyTableBody = document.getElementById('historyTableBody');
    
    if (history.length === 0) {
        emptyHistory.style.display = 'block';
        historyTable.style.display = 'none';
        return;
    }
    
    emptyHistory.style.display = 'none';
    historyTable.style.display = 'table';
    historyTableBody.innerHTML = '';
    
    history.forEach((item) => {
        const row = document.createElement('tr');
        
        // Title cell
        const titleCell = document.createElement('td');
        const titleLink = document.createElement('a');
        titleLink.href = item.objectURL;
        titleLink.target = '_blank';
        titleLink.rel = 'noopener';
        titleLink.className = 'history-link';
        titleLink.textContent = item.title;
        titleCell.appendChild(titleLink);
        
        // Add public domain badge to title if applicable
        if (item.is_public_domain) {
            const pdBadge = document.createElement('span');
            pdBadge.className = 'pd-badge';
            pdBadge.textContent = 'PD';
            pdBadge.title = 'Public Domain';
            titleCell.appendChild(pdBadge);
        }
        
        // Artist cell
        const artistCell = document.createElement('td');
        artistCell.textContent = item.artist || 'Unknown';
        
        // Museum cell
        const museumCell = document.createElement('td');
        museumCell.textContent = item.museum;
        
        // Timestamp cell
        const timeCell = document.createElement('td');
        timeCell.textContent = item.timestamp;
        timeCell.style.fontSize = '0.85rem';
        
        // Action cell (postcard button)
        const actionCell = document.createElement('td');
        if (item.is_public_domain && item.museumShortcode && item.objectId) {
            const postcardBtn = document.createElement('button');
            postcardBtn.className = 'postcard-button';
            postcardBtn.textContent = 'Create Postcard';
            postcardBtn.addEventListener('click', () => {
                const postcardUrl = `https://sweetpost.art/create?museum=${item.museumShortcode}&object_id=${item.objectId}`;
                window.open(postcardUrl, '_blank');
            });
            actionCell.appendChild(postcardBtn);
        } else {
            actionCell.textContent = '-';
            actionCell.style.color = '#ccc';
        }
        
        row.appendChild(titleCell);
        row.appendChild(artistCell);
        row.appendChild(museumCell);
        row.appendChild(timeCell);
        row.appendChild(actionCell);
        
        historyTableBody.appendChild(row);
    });
}

// Clear history functionality
document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your viewing history?')) {
        browserAPI.storage.local.set({ museumArtHistory: [] }, () => {
            loadHistory();
            showStatus();
        });
    }
});

// Load history on page load
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    
    // Refresh history every few seconds in case it's updated from another tab
    setInterval(loadHistory, 3000);
    
    // Listen for system dark mode preference changes
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addListener(() => {
            browserAPI.storage.local.get(['darkMode'], (result) => {
                if (result.darkMode === 'auto') {
                    applyDarkMode('auto');
                }
            });
        });
    }
});
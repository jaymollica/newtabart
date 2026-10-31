// Settings page: appearance and art sources.
// Shared helpers (browserAPI, dark mode, showStatus) live in pages-common.js.

const defaultSettings = {
    enableWhitney: true,
    // Off by default: AIC images are currently blocked by Cloudflare and often
    // fail to load (art-institute-of-chicago/data-aggregator#157).
    enableAIC: false,
    enableCleveland: true,
    enableMet: true,
    enableWikimedia: false,
    darkMode: 'auto', // 'off', 'on', or 'auto'
    highlightsOnly: false,
    historyLimit: 10
};

const checkboxes = [
    document.getElementById('enableWhitney'),
    document.getElementById('enableAIC'),
    document.getElementById('enableCleveland'),
    document.getElementById('enableMet'),
    document.getElementById('enableWikimedia')
];

// Load saved settings
browserAPI.storage.local.get(defaultSettings, (result) => {
    document.getElementById('enableWhitney').checked = result.enableWhitney;
    document.getElementById('enableAIC').checked = result.enableAIC;
    document.getElementById('enableCleveland').checked = result.enableCleveland;
    document.getElementById('enableMet').checked = result.enableMet;
    document.getElementById('enableWikimedia').checked = result.enableWikimedia;

    const darkMode = result.darkMode || 'auto';
    document.getElementById('darkModeOff').checked = (darkMode === 'off');
    document.getElementById('darkModeOn').checked = (darkMode === 'on');
    document.getElementById('darkModeAuto').checked = (darkMode === 'auto');

    document.getElementById('highlightsOnly').checked = !!result.highlightsOnly;
    document.getElementById('historyLimit').value = String(result.historyLimit || 10);
});

document.getElementById('highlightsOnly').addEventListener('change', saveSettings);
document.getElementById('historyLimit').addEventListener('change', saveSettings);

initDarkMode();

// Save settings when any source toggle changes
checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const anyEnabled = checkboxes.some(cb => cb.checked);
        if (!anyEnabled) {
            // Prevent disabling all sources
            checkbox.checked = true;
            showStatus('warning', 3000);
            return;
        }
        saveSettings();
    });
});

// Dark mode radio buttons
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
        darkMode: document.querySelector('input[name="darkMode"]:checked').value,
        highlightsOnly: document.getElementById('highlightsOnly').checked,
        historyLimit: parseInt(document.getElementById('historyLimit').value, 10) || 10
    };
    browserAPI.storage.local.set(settings, () => {
        showStatus('status');
        // The new tab page caches the next artwork against the current
        // settings; drop it so a changed source or filter takes effect
        // on the very next tab.
        browserAPI.storage.local.remove('museumArtPrefetched');
    });
}

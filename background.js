// Manifest V3 Service Worker
// Note: Service workers don't have direct access to the DOM or browser-polyfill.js
// We use chrome API directly, which works in both Chrome and modern Firefox

// Use chrome API (works in MV3)
const browserAPI = chrome;

// Handle extension icon clicks
browserAPI.action.onClicked.addListener(function() {
    browserAPI.tabs.create({ 
        'url': browserAPI.runtime.getURL("newpage.html") 
    });
});
// Favorites page. Shared helpers live in pages-common.js.

let lastFavoritesJSON = null;

function loadFavorites() {
    browserAPI.storage.local.get(['museumArtFavorites'], (result) => {
        displayFavorites(result.museumArtFavorites || []);
    });
}

function displayFavorites(favorites) {
    // Skip rebuilding (and re-fetching thumbnails) when nothing changed.
    const json = JSON.stringify(favorites);
    if (json === lastFavoritesJSON) return;
    lastFavoritesJSON = json;

    const emptyFavorites = document.getElementById('emptyFavorites');
    const favoritesTable = document.getElementById('favoritesTable');
    const favoritesTableBody = document.getElementById('favoritesTableBody');

    document.getElementById('exportFavoritesBtn').disabled = favorites.length === 0;
    favoritesTableBody.innerHTML = '';
    if (favorites.length === 0) {
        emptyFavorites.style.display = 'block';
        favoritesTable.style.display = 'none';
        return;
    }

    emptyFavorites.style.display = 'none';
    favoritesTable.style.display = 'table';
    favorites.forEach((item) => {
        favoritesTableBody.appendChild(buildArtworkRow(item, {
            favorite: true,
            // Leave the row in place after un-starring so a slip can be
            // undone; the periodic refresh drops it a few seconds later.
            onFavoriteToggled: (nowFavorite) => {
                if (nowFavorite) return;
                lastFavoritesJSON = null;
            }
        }));
    });
}

document.getElementById('exportFavoritesBtn').addEventListener('click', () => {
    browserAPI.storage.local.get(['museumArtFavorites'], (result) => {
        exportJSON('new-tab-new-art-favorites', result.museumArtFavorites || []);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    loadFavorites();
    // Refresh in case favorites change from another tab
    setInterval(loadFavorites, 3000);
});

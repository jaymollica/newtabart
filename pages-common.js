// Shared helpers for the extension's internal pages
// (options.html, favorites.html, history.html).

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// ---- Dark mode ----

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
    document.body.classList.toggle('dark-mode', shouldBeDark);
}

// Apply the saved dark mode setting and keep following the system
// preference while the page is open. Returns the saved setting.
function initDarkMode(callback) {
    browserAPI.storage.local.get({ darkMode: 'auto' }, (result) => {
        const darkMode = result.darkMode || 'auto';
        applyDarkMode(darkMode);
        if (callback) callback(darkMode);
    });

    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => {
            browserAPI.storage.local.get({ darkMode: 'auto' }, (result) => {
                if (result.darkMode === 'auto') applyDarkMode('auto');
            });
        };
        if (darkModeQuery.addEventListener) {
            darkModeQuery.addEventListener('change', onChange);
        } else {
            darkModeQuery.addListener(onChange);
        }
    }
}

// ---- Status banner ----

function showStatus(id = 'status', duration = 2000) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, duration);
}

// ---- Export ----

// Download `data` as a pretty-printed JSON file.
function exportJSON(baseName, data) {
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- Favorites ----

const FAVORITES_KEY = 'museumArtFavorites';

// Add or remove `item` in the stored favorites list, keyed by objectURL.
// Always re-reads storage first so a toggle from this page never clobbers
// a favorite added from another tab. Calls callback(nowFavorite).
function toggleStoredFavorite(item, callback) {
    browserAPI.storage.local.get([FAVORITES_KEY], (result) => {
        let favorites = result[FAVORITES_KEY] || [];
        const exists = favorites.some(fav => fav.objectURL === item.objectURL);
        if (exists) {
            favorites = favorites.filter(fav => fav.objectURL !== item.objectURL);
        } else {
            favorites.unshift({
                title: item.title,
                artist: item.artist || '',
                museum: item.museum,
                objectURL: item.objectURL,
                imgPath: item.imgPath,
                objectDate: item.objectDate || '',
                is_public_domain: item.is_public_domain,
                museumShortcode: item.museumShortcode,
                objectId: item.objectId,
                timestamp: new Date().toLocaleString()
            });
        }
        browserAPI.storage.local.set({ [FAVORITES_KEY]: favorites }, () => {
            if (callback) callback(!exists);
        });
    });
}

// A star button that favorites/unfavorites `item` in place.
function createFavoriteToggle(item, isFavorite, onToggled) {
    const btn = document.createElement('button');
    btn.className = 'star-button';
    const render = (fav) => {
        btn.textContent = fav ? '★' : '☆';
        btn.classList.toggle('is-favorite', fav);
        btn.title = fav ? 'Remove from favorites' : 'Add to favorites';
        btn.setAttribute('aria-label', btn.title);
        btn.setAttribute('aria-pressed', String(fav));
    };
    render(isFavorite);
    btn.addEventListener('click', () => {
        btn.disabled = true;
        toggleStoredFavorite(item, (nowFavorite) => {
            render(nowFavorite);
            btn.disabled = false;
            if (onToggled) onToggled(nowFavorite, item);
        });
    });
    return btn;
}

// ---- Artwork table rows ----

function createPostcardButton(item) {
    const btn = document.createElement('button');
    btn.className = 'postcard-button';
    btn.textContent = 'Create Postcard';
    btn.addEventListener('click', () => {
        const postcardUrl = `https://sweetpost.art/create?museum=${item.museumShortcode}&object_id=${item.objectId}`;
        window.open(postcardUrl, '_blank');
    });
    return btn;
}

// Build a <tr> for a stored artwork (history entry or favorite).
// options.favorite          - true/false: add a star toggle cell in that state
// options.onFavoriteToggled - called as (nowFavorite, item) after a toggle
// options.showTime          - add a "Viewed" timestamp cell
// options.onRemove          - if given, add a Remove button calling onRemove(item)
function buildArtworkRow(item, options = {}) {
    const row = document.createElement('tr');

    // Favorite star
    if (typeof options.favorite === 'boolean') {
        const starCell = document.createElement('td');
        starCell.className = 'star-cell';
        starCell.appendChild(createFavoriteToggle(item, options.favorite, options.onFavoriteToggled));
        row.appendChild(starCell);
    }

    // Thumbnail
    const thumbCell = document.createElement('td');
    if (item.imgPath) {
        const thumbLink = document.createElement('a');
        thumbLink.href = item.objectURL;
        thumbLink.target = '_blank';
        thumbLink.rel = 'noopener';
        const thumb = document.createElement('img');
        thumb.className = 'fav-thumb';
        thumb.src = item.imgPath;
        thumb.alt = item.title || '';
        thumb.loading = 'lazy';
        thumbLink.appendChild(thumb);
        thumbCell.appendChild(thumbLink);
    }
    row.appendChild(thumbCell);

    // Title (+ public domain badge)
    const titleCell = document.createElement('td');
    const titleLink = document.createElement('a');
    titleLink.href = item.objectURL;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener';
    titleLink.className = 'history-link';
    titleLink.textContent = item.title;
    titleCell.appendChild(titleLink);
    if (item.is_public_domain) {
        const pdBadge = document.createElement('span');
        pdBadge.className = 'pd-badge';
        pdBadge.textContent = 'PD';
        pdBadge.title = 'Public Domain';
        titleCell.appendChild(pdBadge);
    }
    row.appendChild(titleCell);

    // Artist
    const artistCell = document.createElement('td');
    artistCell.textContent = item.artist || 'Unknown';
    row.appendChild(artistCell);

    // Museum
    const museumCell = document.createElement('td');
    museumCell.textContent = item.museum;
    row.appendChild(museumCell);

    // Viewed timestamp
    if (options.showTime) {
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        timeCell.textContent = item.timestamp;
        row.appendChild(timeCell);
    }

    // Actions
    const actionCell = document.createElement('td');
    const canPostcard = item.is_public_domain && item.museumShortcode && item.objectId;
    if (canPostcard) {
        actionCell.appendChild(createPostcardButton(item));
    }
    if (options.onRemove) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-button';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => options.onRemove(item));
        actionCell.appendChild(removeBtn);
    }
    if (!canPostcard && !options.onRemove) {
        actionCell.textContent = '-';
        actionCell.className = 'no-action';
    }
    row.appendChild(actionCell);

    return row;
}

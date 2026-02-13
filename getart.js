// Museum Art Browser Extension - Refactored with Postcard Feature
class MuseumArtApp {
    constructor() {
        this.museums = {
            wht: new WhitneyMuseum(),
            aic: new ArtInstituteChicago(),
            cma: new ClevelandMuseum(),
            met: new MetropolitanMuseum(),
            wmc: new WikimediaCommons()
        };
        
        this.activeMuseums = {
            wht: this.museums.wht,
            aic: this.museums.aic,
            cma: this.museums.cma,
            met: this.museums.met
        };
        
        this.maxArtworkRetries = 5;
        this.requestTimeoutMs = 4000;
        this.prefetchStorageKey = 'museumArtPrefetch';
        this.lastArtworkStorageKey = 'museumArtLastArtwork';
        this.maxHistoryItems = 10;
        this.historyStorageKey = 'museumArtHistory';
        this.viewHistory = [];
        this.isPrefetching = false;
        this.loadHistory();
        this.init();
    }

    async init() {
        await this.loadSettings();
        document.addEventListener('DOMContentLoaded', () => {
            this.bootstrapArtworkFlow();
        });
    }

    async loadSettings() {
        return new Promise((resolve) => {
            const defaultSettings = {
                enableWhitney: true,
                enableAIC: true,
                enableCleveland: true,
                enableMet: true,
                enableWikimedia: false
            };

            if (!this.hasChromeStorage()) {
                this.activeMuseums = {
                    wht: this.museums.wht,
                    aic: this.museums.aic,
                    cma: this.museums.cma,
                    met: this.museums.met
                };
                resolve();
                return;
            }

            const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
            browserAPI.storage.local.get(defaultSettings, (result) => {
                this.activeMuseums = {};
                if (result.enableWhitney) this.activeMuseums.wht = this.museums.wht;
                if (result.enableAIC) this.activeMuseums.aic = this.museums.aic;
                if (result.enableCleveland) this.activeMuseums.cma = this.museums.cma;
                if (result.enableMet) this.activeMuseums.met = this.museums.met;
                if (result.enableWikimedia) this.activeMuseums.wmc = this.museums.wmc;
                if (Object.keys(this.activeMuseums).length === 0) {
                    this.activeMuseums.met = this.museums.met;
                }
                resolve();
            });
        });
    }

    getRandomMuseum() {
        const keys = Object.keys(this.activeMuseums);
        if (keys.length === 0) {
            return this.museums.met;
        }
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return this.activeMuseums[randomKey];
    }

    async bootstrapArtworkFlow() {
        this.showLoadingState();

        const prefetchedArtwork = await this.takePrefetchedArtwork();
        if (this.isValidArtwork(prefetchedArtwork)) {
            this.displayArtwork(prefetchedArtwork);
            this.prefetchArtworkInBackground();
            return;
        }

        const lastArtwork = await this.getFromStorage(this.lastArtworkStorageKey);
        if (this.isValidArtwork(lastArtwork)) {
            this.displayArtwork(lastArtwork, { saveToHistory: false, saveAsLast: false });
        }

        const freshArtwork = await this.getRandomArtworkData();
        if (this.isValidArtwork(freshArtwork)) {
            this.displayArtwork(freshArtwork);
            this.prefetchArtworkInBackground();
            return;
        }

        if (!this.isValidArtwork(lastArtwork)) {
            this.showErrorState('Unable to load artwork right now. Try again in a moment.');
        } else {
            this.prefetchArtworkInBackground();
        }
    }

    async loadRandomArtwork() {
        const artworkData = await this.getRandomArtworkData();
        if (!this.isValidArtwork(artworkData)) {
            this.showErrorState('Unable to load artwork right now. Try again in a moment.');
            return;
        }
        this.displayArtwork(artworkData);
        this.prefetchArtworkInBackground();
    }

    async getRandomArtworkData(maxAttempts = this.maxArtworkRetries) {
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const museum = this.getRandomMuseum();
        try {
            const artworkData = await this.fetchRandomArtwork(museum);
                if (this.isValidArtwork(artworkData)) {
                    return artworkData;
            }
        } catch (error) {
                console.error(`Attempt ${attempt} failed for ${museum.museum}:`, error);
            }
            await this.sleep(Math.min(150 * attempt, 600));
        }
        return null;
    }

    isValidArtwork(artworkData) {
        return Boolean(artworkData && artworkData.imgPath);
    }

    async fetchRandomArtwork(museum) {
        const url = museum.getRandomUrl();
        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return await museum.formatData(data);
        } catch (error) {
            console.error(`Error fetching from ${museum.museum}:`, error);
            throw error;
        }
    }

    async fetchWithTimeout(url, timeoutMs = this.requestTimeoutMs) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, {
                signal: controller.signal,
                cache: 'no-store'
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async prefetchArtworkInBackground() {
        if (this.isPrefetching) {
            return;
        }
        this.isPrefetching = true;
        try {
            const nextArtwork = await this.getRandomArtworkData(3);
            if (this.isValidArtwork(nextArtwork)) {
                await this.setInStorage(this.prefetchStorageKey, nextArtwork);
            }
        } catch (error) {
            console.error('Error prefetching artwork:', error);
        } finally {
            this.isPrefetching = false;
        }
    }

    async takePrefetchedArtwork() {
        const prefetchedArtwork = await this.getFromStorage(this.prefetchStorageKey);
        await this.removeFromStorage(this.prefetchStorageKey);
        return prefetchedArtwork;
    }

    showLoadingState() {
        $('#objectContainer').html(`
            <div class="loadingState">
                <div class="loadingSpinner"></div>
                <p>Loading a new artwork...</p>
            </div>
        `);
    }

    showErrorState(message) {
        $('#objectContainer').html(`
            <div class="loadingState">
                <p>${message}</p>
                <p><a href="options.html" id="settingsLink">Settings and history</a></p>
            </div>
        `);
    }

    displayArtwork(data, options = {}) {
        const { saveToHistory = true, saveAsLast = true } = options;
        const {
            imgPath, artistCulture, title, objectDate, nationality, culture,
            objectURL, description, museumName, docs, is_public_domain,
            museumShortcode, objectId
        } = data;

        if (saveToHistory) {
        this.addToHistory(data);
        }
        if (saveAsLast) {
            this.setInStorage(this.lastArtworkStorageKey, data);
        }
        $('#objectContainer').empty();

        const objectLink = $('<div class="objectLink">');
        const imgContainer = $('<div class="imgContainer">');
        this.loadImage(imgPath, imgContainer);
        imgContainer.appendTo(objectLink);

        const captionContainer = $('<div class="captionContainer">');
        this.buildCaption(captionContainer, {
            title: this.formatTitle(title, objectDate),
            artist: artistCulture || culture,
            nationality, objectURL, objectDate, description,
            museumName, docs, is_public_domain,
            museumShortcode, objectId
        });
        
        captionContainer.appendTo(objectLink);
        objectLink.appendTo('#objectContainer');
    }

    loadImage(imgPath, container) {
        const img = new Image();
        img.onload = () => {
            $(`<img src="${imgPath}" style="display: none;">`)
                .appendTo(container)
                .fadeIn(1000);
        };
        img.onerror = () => {
            $('<p class="description">Unable to load image.</p>').appendTo(container);
        };
        img.src = imgPath;
    }

    formatTitle(title, objectDate) {
        return objectDate ? `${title}, ` : title;
    }

    buildCaption(container, data) {
        $('<p class="topLine"><span class="title">'+data.title+'</span><span class="date">'+(data.objectDate || '')+'</span></p>').appendTo(container);
        $('<p><span class="artist">'+data.artist+'</span> <span class="nationality">'+data.nationality+'</span></p>').appendTo(container);
        $('<p class="sourceLinkContainer"><a class="sourceLink" href="'+data.objectURL+'">'+data.objectURL+'</a></p>').appendTo(container);

        if (data.description) {
            const objDescContainer = $('<p class="objectDescriptionContainer"></p>');
            const objDescSpan = $('<span class="objectDescription"></span>');
            objDescSpan.html(data.description);
            objDescSpan.appendTo(objDescContainer);
            objDescContainer.appendTo(container);
        }

        const description = $('<p class="descriptionContainer"><span class="description">This artwork is sourced from the <a href="'+data.docs+'">'+data.museumName+' Collection API</a>. This browser extension is not affiliated with the museum. The source code for the extension can be found on <a href="https://github.com/jaymollica/newtabart">github</a>.</span></p>');
        description.appendTo(container);

        // Add settings link
        const settingsLink = $('<a id="settingsLink" href="options.html">⚙ Settings</a>');
        settingsLink.appendTo(container);

        $('<br/>').appendTo(container);
        
        if (data.is_public_domain) {
            const objPublicDomainContainer = $('<p class="objectPublicDomainContainer"></p>');
            objPublicDomainContainer.html('<span class="description">This object is in the public domain.</span>');
            objPublicDomainContainer.appendTo(container);

            if (data.museumShortcode && data.objectId) {
                this.createPostcardButton(container, data.museumShortcode, data.objectId);
            }
        }
    }

    createPostcardButton(container, museumShortcode, objectId) {
        const postcardContainer = $('<p class="postcardContainer"></p>');
        const postcardButton = $('<button class="postcardButton">Create Postcard</button>');
        postcardButton.on('click', () => {
            const postcardUrl = `https://sweetpost.art/?museum=${museumShortcode}&object_id=${objectId}`;
            window.open(postcardUrl, '_blank');
        });
        postcardButton.appendTo(postcardContainer);
        postcardContainer.appendTo(container);
    }

    addToHistory(data) {
        const historyItem = {
            title: data.title,
            artist: data.artistCulture || data.culture,
            museum: data.museumName,
            objectURL: data.objectURL,
            timestamp: new Date().toLocaleString(),
            is_public_domain: data.is_public_domain,
            museumShortcode: data.museumShortcode,
            objectId: data.objectId
        };

        this.viewHistory = Array.isArray(this.viewHistory) ? this.viewHistory : [];
        this.viewHistory = this.viewHistory.filter(item => item.objectURL !== historyItem.objectURL);
        this.viewHistory.unshift(historyItem);

        if (this.viewHistory.length > this.maxHistoryItems) {
            this.viewHistory = this.viewHistory.slice(0, this.maxHistoryItems);
        }

        this.saveHistory();
    }

    loadHistory() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get([this.storageKey], (result) => {
                    this.viewHistory = result[this.storageKey] || [];
                });
            } else {
                const saved = localStorage.getItem(this.historyStorageKey);
                this.viewHistory = saved ? JSON.parse(saved) : [];
            }
        } catch (error) {
            console.error('Error loading history from storage:', error);
            this.viewHistory = [];
        }
    }

    saveHistory() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const data = {};
                data[this.storageKey] = this.viewHistory;
                chrome.storage.local.set(data);
            } else {
                localStorage.setItem(this.historyStorageKey, JSON.stringify(this.viewHistory));
            }
        } catch (error) {
            console.error('Error saving history to storage:', error);
        }
    }

    hasChromeStorage() {
        return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
    }

    async getFromStorage(key) {
        if (!this.hasChromeStorage()) {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }

        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] || null);
            });
        });
    }

    async setInStorage(key, value) {
        if (!this.hasChromeStorage()) {
            localStorage.setItem(key, JSON.stringify(value));
            return;
        }

        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, resolve);
        });
    }

    async removeFromStorage(key) {
        if (!this.hasChromeStorage()) {
            localStorage.removeItem(key);
            return;
        }

        return new Promise((resolve) => {
            chrome.storage.local.remove([key], resolve);
        });
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

class Museum {
    constructor(config) {
        Object.assign(this, config);
    }
    getRandomUrl() {
        throw new Error('getRandomUrl must be implemented by subclass');
    }
    async formatData(data) {
        throw new Error('formatData must be implemented by subclass');
    }
}

class WhitneyMuseum extends Museum {
    constructor() {
        super({
            museum: "Whitney Museum",
            shortname: "wht",
            endPoint: "https://whitney.org/api/artworks/",
            docs: "https://whitney.org/about/website/api",
            maxInt: "27254",
            maxPage: "909"
        });
    }

    getRandomUrl() {
        const randInt = Math.floor(Math.random() * this.maxPage);
        return `${this.endPoint}${randInt}`;
    }

    async formatData(data) {
        let artistName = '';
        if (data.data?.relationships?.artists?.data?.length > 0) {
            const artistId = data.data.relationships.artists.data[0].id;
            artistName = await this.getArtist(artistId);
        }
        const objectId = data.data?.attributes?.tms_id || '';
        return {
            imgPath: data.data?.attributes?.images?.[0]?.url || '',
            artistCulture: artistName,
            title: data.data?.attributes?.title || '',
            nationality: '',
            objectDate: data.data?.attributes?.display_date || '',
            objectURL: objectId ? `https://whitney.org/collection/works/${objectId}` : '',
            description: data.data?.attributes?.object_label || '',
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: false,
            museumShortcode: this.shortname,
            objectId: objectId
        };
    }

    async getArtist(id) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
            const response = await fetch(`https://whitney.org/api/artists/${id}`, {
                signal: controller.signal,
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.data?.attributes?.display_name || '';
        } catch (error) {
            console.error(`Error fetching artist ${id}:`, error);
            return '';
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

class ArtInstituteChicago extends Museum {
    constructor() {
        super({
            museum: "Art Institute of Chicago",
            shortname: "aic",
            endPoint: "https://api.artic.edu/api/v1/artworks/",
            docs: "https://api.artic.edu/docs/",
            maxInt: "125841",
            maxPage: "10487"
        });
    }

    getRandomUrl() {
        const randInt = Math.floor(Math.random() * this.maxInt);
        return `${this.endPoint}?limit=1&page=${randInt}`;
    }

    async formatData(data) {
        if (!data.data || data.data.length === 0) {
            return { imgPath: '' };
        }
        const artwork = data.data[0];
        let imgUrl = '';
        if (artwork.image_id) {
            const imgBaseUrl = data.config.iiif_url;
            imgUrl = `${imgBaseUrl}/${artwork.image_id}/full/843,/0/default.jpg`;
        }
        return {
            imgPath: imgUrl,
            artistCulture: artwork.artist_display || '',
            title: artwork.title || '',
            nationality: artwork.place_of_origin || '',
            objectDate: artwork.date_display || '',
            objectURL: `https://www.artic.edu/artworks/${artwork.id}`,
            culture: artwork.category_titles || '',
            description: artwork.description || '',
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: artwork.is_public_domain || false,
            museumShortcode: this.shortname,
            objectId: artwork.id
        };
    }
}

class ClevelandMuseum extends Museum {
    constructor() {
        super({
            museum: "Cleveland Museum of Art",
            shortname: "cma",
            endPoint: "https://openaccess-api.clevelandart.org/api/artworks/",
            docs: "https://openaccess-api.clevelandart.org/",
            maxInt: "29144"
        });
    }

    getRandomUrl() {
        const randInt = Math.floor(Math.random() * this.maxInt);
        return `${this.endPoint}?has_image=1&limit=1&skip=${randInt}`;
    }

    async formatData(data) {
        if (!data.data || data.data.length === 0) {
            return { imgPath: '' };
        }
        const artwork = data.data[0];
        const wallDescription = artwork.wall_description === 'null' ? '' : artwork.wall_description;
        const artist = artwork.creators?.length > 0 ? artwork.creators[0].description : '';
        const isPublicDomain = artwork.share_license_status === 'CC0';
        return {
            imgPath: artwork.images?.web?.url || '',
            artistCulture: artist,
            title: artwork.title || '',
            nationality: artwork.artistNationality || '',
            objectDate: artwork.creation_date || '',
            objectURL: artwork.url || '',
            culture: artwork.culture?.[0] || '',
            description: wallDescription,
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: isPublicDomain,
            museumShortcode: this.shortname,
            objectId: artwork.id
        };
    }
}

class MetropolitanMuseum extends Museum {
    constructor() {
        super({
            museum: "Metropolitan Museum of Art",
            shortname: "met",
            endPoint: "https://collectionapi.metmuseum.org/public/collection/v1/objects/",
            docs: "https://metmuseum.github.io/",
            maxInt: "471581"
        });
    }

    getRandomUrl() {
        const randInt = Math.floor(Math.random() * this.maxInt);
        return `${this.endPoint}${randInt}`;
    }

    async formatData(data) {
        return {
            imgPath: data.primaryImageSmall || '',
            artistCulture: data.artistDisplayName || '',
            title: data.title || '',
            nationality: data.artistNationality || '',
            objectDate: data.objectDate || '',
            objectURL: data.objectURL || '',
            culture: data.culture || '',
            description: data.wall_description || '',
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: data.isPublicDomain || false,
            museumShortcode: this.shortname,
            objectId: data.objectID
        };
    }
}

class WikimediaCommons extends Museum {
    constructor() {
        super({
            museum: "Wikimedia Commons",
            shortname: "wmc",
            endPoint: "https://commons.wikimedia.org/w/api.php",
            docs: "https://commons.wikimedia.org/wiki/Commons:API",
            searchTerms: [
                'painting oil canvas', 'sculpture marble bronze', 'renaissance art',
                'impressionist painting', 'portrait painting', 'landscape painting',
                'ancient sculpture', 'modern art', 'classical art', 'baroque painting'
            ]
        });
    }

    getRandomUrl() {
        const searchTerm = this.searchTerms[Math.floor(Math.random() * this.searchTerms.length)];
        const offset = Math.floor(Math.random() * 100);
        return `${this.endPoint}?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchTerm)}&gsrlimit=50&gsroffset=${offset}&prop=imageinfo&iiprop=url|extmetadata|size&origin=*`;
    }

    async formatData(data) {
        try {
            if (!data.query || !data.query.pages) return { imgPath: '' };
            const pages = Object.values(data.query.pages);
            const imagesOnly = pages.filter(page => {
                if (!page.imageinfo || !page.imageinfo[0]) return false;
                const info = page.imageinfo[0];
                const hasUrl = info.url;
                const isImageType = info.url && info.url.match(/\.(jpg|jpeg|png)$/i);
                const hasSize = info.width && info.height;
                const goodSize = info.width >= 400 && info.height >= 400;
                const notTooBig = info.width <= 5000 && info.height <= 5000;
                return hasUrl && isImageType && hasSize && goodSize && notTooBig;
            });
            if (imagesOnly.length === 0) return { imgPath: '' };
            
            const randomPage = imagesOnly[Math.floor(Math.random() * imagesOnly.length)];
            const imageInfo = randomPage.imageinfo[0];
            const metadata = imageInfo.extmetadata || {};
            
            const stripHtml = (html) => {
                if (!html) return '';
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                return tmp.textContent || tmp.innerText || '';
            };
            
            let rawTitle = stripHtml(metadata.ObjectName?.value) || 
                        stripHtml(metadata.ImageDescription?.value) || 
                        randomPage.title.replace('File:', '').replace(/\.(jpg|jpeg|png)$/i, '');
            const wikidataLabelMatch = rawTitle.match(/label QS:[^,]+,"([^"]+)"/);
            if (wikidataLabelMatch) {
                rawTitle = wikidataLabelMatch[1];
            } else {
                rawTitle = rawTitle.replace(/label QS:[^\s,]+,?\s*/g, '').trim();
            }
            
            const title = rawTitle;
            const artist = stripHtml(metadata.Artist?.value) || stripHtml(metadata.Credit?.value) || 'Unknown';
            const rawDate = stripHtml(metadata.DateTimeOriginal?.value) || stripHtml(metadata.DateTime?.value) || '';
            
            let displayDate = rawDate;
            let year = null;
            const wikidataMatch = rawDate.match(/\+?(\d{4})-/);
            if (wikidataMatch) {
                year = parseInt(wikidataMatch[1]);
                displayDate = year.toString();
            } else {
                const yearMatch = rawDate.match(/(\d{4})/);
                if (yearMatch) {
                    year = parseInt(yearMatch[1]);
                    displayDate = rawDate;
                }
            }
            
            const description = stripHtml(metadata.ImageDescription?.value) || '';
            const filename = randomPage.title.replace('File:', '');
            const licenseShortName = metadata.LicenseShortName?.value || '';
            const licenseUrl = metadata.LicenseUrl?.value || '';
            const copyrightStatus = metadata.Copyrighted?.value || '';
            const publicDomainLicenses = ['CC0', 'Public domain', 'PD', 'PDM'];
            const isArtworkPublicDomain = copyrightStatus.toLowerCase().includes('false') || 
                                        copyrightStatus.toLowerCase().includes('public domain');
            const hasCompatibleLicense = publicDomainLicenses.some(license => 
                licenseShortName.includes(license) || licenseUrl.includes('publicdomain')
            );
            const isOldEnough = year && year < 1928;
            const isPublicDomain = (isArtworkPublicDomain || hasCompatibleLicense) && 
                                (isOldEnough || hasCompatibleLicense);
            
            return {
                imgPath: imageInfo.url,
                artistCulture: artist.substring(0, 200),
                title: title.substring(0, 200),
                nationality: '',
                objectDate: displayDate,
                objectURL: imageInfo.descriptionurl,
                culture: '',
                description: description.substring(0, 300),
                museumName: this.museum,
                docs: this.docs,
                is_public_domain: isPublicDomain,
                museumShortcode: this.shortname,
                objectId: filename
            };
        } catch (error) {
            console.error('Error formatting Wikimedia Commons data:', error);
            return { imgPath: '' };
        }
    }
}

const museumApp = new MuseumArtApp();
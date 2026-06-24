const { Plugin, requestUrl } = require('obsidian');
const http = require('http');
const https = require('https');
const nodeUrl = require('url');
const fs = require('fs');
const path = require('path');

module.exports = class HDRezkaPlayerPlugin extends Plugin {
    proxyServer = null;
    proxyPort = 0;
    videoUrls = {};
    videoCounter = 0;
    stylesInjected = false;

    async onload() {
        console.log("HDRezka Player loaded!");
        await this.startProxyServer();
        await this.loadHlsJs();
        this.injectStyles();

        this.registerMarkdownCodeBlockProcessor("hdrezka", async (source, el, ctx) => {
            const url = source.trim();
            if (!url || !url.includes("rezka.ag")) {
                el.createEl("div", { text: "Некорректная ссылка на HDrezka." });
                return;
            }

            const container = el.createEl("div", { cls: "hdrezka-player-container" });
            
            const loadingEl = container.createEl("div", { cls: "hdrezka-loading" });
            loadingEl.innerHTML = '<div class="hdrezka-spinner"></div><div>Загрузка видео с HDrezka...</div>';

            try {
                const pageRes = await requestUrl({
                    url: url,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
                    }
                });
                const html = pageRes.text;

                let cookies = [];
                for (const key in pageRes.headers) {
                    if (key.toLowerCase() === 'set-cookie') {
                        const setCookies = Array.isArray(pageRes.headers[key]) ? pageRes.headers[key] : [pageRes.headers[key]];
                        cookies = setCookies.map(c => c.split(';')[0]);
                    }
                }
                const cookieString = cookies.join('; ');

                let isMovie = true;
                let match = html.match(/initCDNMoviesEvents[^\d]*(\d+)[^\d]*,\s*(\d+)/);
                if (!match) {
                    match = html.match(/initCDNSeriesEvents[^\d]*(\d+)[^\d]*,\s*(\d+)/);
                    isMovie = false;
                }
                if (!match) throw new Error("Не удалось найти ID фильма.");

                const movieId = match[1];
                const defaultTranslatorId = match[2];

                // Парсим переводы через DOMParser
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const translatorEls = doc.querySelectorAll('.b-translator__item');
                const translators = [];
                translatorEls.forEach(el => {
                    translators.push({
                        id: el.getAttribute('data-translator_id'),
                        name: el.textContent.trim().replace(/\s+/g, ' '),
                        isCamrip: el.getAttribute('data-camrip') || '0',
                        isAds: el.getAttribute('data-ads') || '0',
                        isDirector: el.getAttribute('data-director') || '0'
                    });
                });
                
                // Если нет списка переводов (например, фильм только в одной озвучке)
                if (translators.length === 0) {
                    translators.push({
                        id: defaultTranslatorId,
                        name: "По умолчанию",
                        isCamrip: '0', isAds: '0', isDirector: '0'
                    });
                }

                // Функция для загрузки ссылок конкретного перевода
                const fetchQualities = async (translator) => {
                    const bodyParams = new URLSearchParams();
                    bodyParams.append('id', movieId);
                    bodyParams.append('translator_id', translator.id);
                    bodyParams.append('is_camrip', translator.isCamrip);
                    bodyParams.append('is_ads', translator.isAds);
                    bodyParams.append('is_director', translator.isDirector);
                    
                    if (isMovie) {
                        bodyParams.append('action', 'get_movie');
                    } else {
                        bodyParams.append('action', 'get_stream');
                        bodyParams.append('season', '1');
                        bodyParams.append('episode', '1');
                    }

                    const hdrs = {
                        "X-Requested-With": "XMLHttpRequest",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
                        "Accept": "*/*",
                        "Referer": url
                    };
                    if (cookieString) hdrs["Cookie"] = cookieString;

                    const streamRes = await requestUrl({
                        url: "https://rezka.ag/ajax/get_cdn_series/",
                        method: "POST",
                        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                        body: bodyParams.toString(),
                        headers: hdrs
                    });

                    const streamData = streamRes.json;
                    if (streamData && streamData.url === false) {
                        throw new Error("Видео недоступно для вашего региона. Пожалуйста, включите VPN или смените IP-адрес.");
                    }
                    if (!streamData || !streamData.url) {
                        throw new Error("Ответ сервера: " + JSON.stringify(streamData || streamRes.text));
                    }

                    const allUrls = streamData.url.split(',');
                    const qualities = [];
                    for (const u of allUrls) {
                        const parts = u.split(" or ");
                        const link = parts[0].substring(parts[0].indexOf(']') + 1).replace(/\\\//g, '/');
                        const qualityMatch = parts[0].match(/\[([^\]]+)\]/);
                        const quality = qualityMatch ? qualityMatch[1] : "unknown";
                        
                        if (quality.includes('<') || quality.includes('Ultra') || quality.includes('4K')) {
                            continue;
                        }
                        
                        const vid = String(++this.videoCounter);
                        this.videoUrls[vid] = link;
                        qualities.push({
                            label: quality,
                            videoId: vid,
                            proxyUrl: `http://127.0.0.1:${this.proxyPort}/video?id=${vid}`
                        });
                    }
                    return qualities;
                };

                // Загружаем дефолтный перевод (первый активный или просто первый)
                let currentTranslatorIdx = translators.findIndex(t => t.id === defaultTranslatorId);
                if (currentTranslatorIdx < 0) currentTranslatorIdx = 0;
                
                const initialQualities = await fetchQualities(translators[currentTranslatorIdx]);
                
                loadingEl.remove();
                this.createPlayer({
                    container, 
                    initialQualities, 
                    translators, 
                    currentTranslatorIdx,
                    fetchQualities, 
                    isMovie, 
                    url
                });

            } catch (err) {
                loadingEl.innerHTML = '';
                loadingEl.textContent = "Ошибка: " + err.message;
                loadingEl.style.color = "var(--text-error)";
            }
        });
    }

    createPlayer(opts) {
        const { container, translators, fetchQualities, isMovie, url } = opts;
        let qualities = opts.initialQualities;
        let currentTranslatorIdx = opts.currentTranslatorIdx;

        container.innerHTML = '';
        const wrapper = container.createEl("div", { cls: "hdrezka-wrapper" });
        
        const videoEl = wrapper.createEl("video", { cls: "hdrezka-video" });
        videoEl.setAttribute("preload", "auto");

        // Оверлей управления
        const controls = wrapper.createEl("div", { cls: "hdrezka-controls" });
        
        // Прогресс-бар
        const progressWrap = controls.createEl("div", { cls: "hdrezka-progress-wrap" });
        const progressBar = progressWrap.createEl("div", { cls: "hdrezka-progress-bar" });
        const progressFilled = progressBar.createEl("div", { cls: "hdrezka-progress-filled" });
        const progressBuffer = progressBar.createEl("div", { cls: "hdrezka-progress-buffer" });
        const progressHandle = progressBar.createEl("div", { cls: "hdrezka-progress-handle" });

        // Нижняя панель
        const bottomBar = controls.createEl("div", { cls: "hdrezka-bottom-bar" });
        
        // Левая часть (Play, Volume, Time)
        const leftControls = bottomBar.createEl("div", { cls: "hdrezka-controls-left" });
        
        const playBtn = leftControls.createEl("button", { cls: "hdrezka-btn hdrezka-play-btn" });
        playBtn.innerHTML = '▶';
        
        const volumeWrap = leftControls.createEl("div", { cls: "hdrezka-volume-wrap" });
        const volumeBtn = volumeWrap.createEl("button", { cls: "hdrezka-btn hdrezka-volume-btn" });
        volumeBtn.innerHTML = '🔊';
        const volumeSlider = volumeWrap.createEl("input", { cls: "hdrezka-volume-slider", attr: { type: "range", min: "0", max: "1", step: "0.05", value: "1" } });
        
        const timeDisplay = leftControls.createEl("span", { cls: "hdrezka-time" });
        timeDisplay.textContent = "0:00 / 0:00";

        // Правая часть (Voiceover, Speed, Quality, Fullscreen)
        const rightControls = bottomBar.createEl("div", { cls: "hdrezka-controls-right" });

        // Меню переводов (Voiceover)
        const transWrap = rightControls.createEl("div", { cls: "hdrezka-dropdown-wrap" });
        const transBtn = transWrap.createEl("button", { cls: "hdrezka-btn hdrezka-voice-btn", title: "Озвучка" });
        transBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>';
        
        const transMenu = transWrap.createEl("div", { cls: "hdrezka-dropdown-menu hdrezka-voice-menu" });
        
        // Скорость
        const speedWrap = rightControls.createEl("div", { cls: "hdrezka-dropdown-wrap" });
        const speedBtn = speedWrap.createEl("button", { cls: "hdrezka-btn hdrezka-speed-btn" });
        speedBtn.textContent = "1x";
        const speedMenu = speedWrap.createEl("div", { cls: "hdrezka-dropdown-menu" });
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        
        // Качество
        const qualityWrap = rightControls.createEl("div", { cls: "hdrezka-dropdown-wrap" });
        const qualityBtn = qualityWrap.createEl("button", { cls: "hdrezka-btn hdrezka-quality-btn" });
        const qualityMenu = qualityWrap.createEl("div", { cls: "hdrezka-dropdown-menu" });

        // Полный экран
        const fullscreenBtn = rightControls.createEl("button", { cls: "hdrezka-btn hdrezka-fullscreen-btn" });
        fullscreenBtn.innerHTML = '⛶';

        // --- Состояние плеера ---
        let currentHls = null;
        let currentQualityIdx = 0;
        let currentPlaybackRate = 1;

        const closeAllMenus = () => {
            speedMenu.classList.remove('show');
            qualityMenu.classList.remove('show');
            transMenu.classList.remove('show');
        };

        const loadVideoEngine = (idx, restoreTime = 0, autoPlay = false) => {
            if (currentHls) {
                currentHls.destroy();
                currentHls = null;
            }

            currentQualityIdx = idx;
            qualityBtn.textContent = qualities[idx].label;
            qualityMenu.querySelectorAll('.hdrezka-dropdown-item').forEach(el => el.classList.remove('active'));
            qualityMenu.children[idx]?.classList.add('active');

            if (window.Hls && Hls.isSupported()) {
                const proxyPort = this.proxyPort;
                const hls = new Hls({
                    debug: false,
                    xhrSetup: function(xhr, hlsUrl) {
                        const proxied = `http://127.0.0.1:${proxyPort}/proxy?url=${encodeURIComponent(hlsUrl)}`;
                        xhr.open('GET', proxied, true);
                    }
                });
                currentHls = hls;
                hls.loadSource(qualities[idx].proxyUrl);
                hls.attachMedia(videoEl);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoEl.playbackRate = currentPlaybackRate;
                    if (restoreTime > 0) videoEl.currentTime = restoreTime;
                    if (autoPlay) videoEl.play();
                });
            } else {
                videoEl.src = qualities[idx].proxyUrl;
                videoEl.playbackRate = currentPlaybackRate;
                if (restoreTime > 0) videoEl.currentTime = restoreTime;
                if (autoPlay) videoEl.play();
            }
        };

        const renderQualityMenu = () => {
            qualityMenu.innerHTML = '';
            qualities.forEach((q, i) => {
                const item = qualityMenu.createEl("div", { cls: `hdrezka-dropdown-item ${i === currentQualityIdx ? 'active' : ''}` });
                item.textContent = q.label;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    loadVideoEngine(i, videoEl.currentTime, !videoEl.paused);
                    closeAllMenus();
                });
            });
            qualityBtn.textContent = qualities[currentQualityIdx].label;
        };

        const changeTranslator = async (idx) => {
            const currentTime = videoEl.currentTime;
            const wasPlaying = !videoEl.paused;
            currentTranslatorIdx = idx;
            
            transMenu.querySelectorAll('.hdrezka-dropdown-item').forEach(el => el.classList.remove('active'));
            transMenu.children[idx]?.classList.add('active');
            
            // Показываем микро-лоадер
            qualityBtn.textContent = "...";
            try {
                const newQualities = await fetchQualities(translators[idx]);
                qualities = newQualities;
                
                // Ищем качество 1080p, либо 720p, либо последнее
                let defaultIdx = qualities.findIndex(q => q.label === '1080p');
                if (defaultIdx < 0) defaultIdx = qualities.findIndex(q => q.label === '720p');
                if (defaultIdx < 0) defaultIdx = qualities.length - 1;
                
                currentQualityIdx = defaultIdx;
                renderQualityMenu();
                loadVideoEngine(defaultIdx, currentTime, wasPlaying);
            } catch (e) {
                console.error("Failed to load translator:", e);
                qualityBtn.textContent = "Ошибка";
            }
        };

        // Заполняем меню озвучек
        if (translators.length <= 1) {
            transWrap.style.display = "none";
        } else {
            translators.forEach((t, i) => {
                const item = transMenu.createEl("div", { cls: `hdrezka-dropdown-item ${i === currentTranslatorIdx ? 'active' : ''}` });
                item.textContent = t.name;
                item.title = t.name;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (i !== currentTranslatorIdx) changeTranslator(i);
                    closeAllMenus();
                });
            });
        }

        // Заполняем меню скоростей
        speeds.forEach(s => {
            const item = speedMenu.createEl("div", { cls: `hdrezka-dropdown-item ${s === 1 ? 'active' : ''}` });
            item.textContent = s + 'x';
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                currentPlaybackRate = s;
                videoEl.playbackRate = s;
                speedBtn.textContent = s + 'x';
                speedMenu.querySelectorAll('.hdrezka-dropdown-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                closeAllMenus();
            });
        });

        // Слушатели кликов по кнопкам
        transBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShowing = transMenu.classList.contains('show');
            closeAllMenus();
            if (!isShowing) transMenu.classList.add('show');
        });
        speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShowing = speedMenu.classList.contains('show');
            closeAllMenus();
            if (!isShowing) speedMenu.classList.add('show');
        });
        qualityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShowing = qualityMenu.classList.contains('show');
            closeAllMenus();
            if (!isShowing) qualityMenu.classList.add('show');
        });
        document.addEventListener('click', closeAllMenus);

        // Инициализация (дефолт качество)
        let initialIdx = qualities.findIndex(q => q.label === '1080p');
        if (initialIdx < 0) initialIdx = qualities.findIndex(q => q.label === '720p');
        if (initialIdx < 0) initialIdx = qualities.length - 1;
        
        currentQualityIdx = initialIdx;
        renderQualityMenu();
        loadVideoEngine(initialIdx);

        // --- Стандартные события плеера ---
        
        playBtn.addEventListener('click', () => { videoEl.paused ? videoEl.play() : videoEl.pause(); });
        videoEl.addEventListener('click', () => { videoEl.paused ? videoEl.play() : videoEl.pause(); });
        videoEl.addEventListener('play', () => { playBtn.innerHTML = '⏸'; });
        videoEl.addEventListener('pause', () => { playBtn.innerHTML = '▶'; });

        const formatTime = (s) => {
            if (isNaN(s)) return '0:00';
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = Math.floor(s % 60);
            if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
            return `${m}:${sec.toString().padStart(2,'0')}`;
        };
        videoEl.addEventListener('timeupdate', () => {
            const pct = (videoEl.currentTime / videoEl.duration) * 100;
            progressFilled.style.width = pct + '%';
            progressHandle.style.left = pct + '%';
            timeDisplay.textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration)}`;
        });
        videoEl.addEventListener('progress', () => {
            if (videoEl.buffered.length > 0) {
                const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1);
                const pct = (bufferedEnd / videoEl.duration) * 100;
                progressBuffer.style.width = pct + '%';
            }
        });

        let isDragging = false;
        const seekTo = (e) => {
            const rect = progressBar.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            videoEl.currentTime = pct * videoEl.duration;
        };
        progressBar.addEventListener('mousedown', (e) => { isDragging = true; seekTo(e); });
        document.addEventListener('mousemove', (e) => { if (isDragging) seekTo(e); });
        document.addEventListener('mouseup', () => { isDragging = false; });

        volumeSlider.addEventListener('input', () => {
            videoEl.volume = volumeSlider.value;
            volumeBtn.innerHTML = videoEl.volume === 0 ? '🔇' : videoEl.volume < 0.5 ? '🔉' : '🔊';
        });
        volumeBtn.addEventListener('click', () => {
            videoEl.muted = !videoEl.muted;
            volumeBtn.innerHTML = videoEl.muted ? '🔇' : '🔊';
        });

        fullscreenBtn.addEventListener('click', () => {
            document.fullscreenElement ? document.exitFullscreen() : wrapper.requestFullscreen();
        });
        videoEl.addEventListener('dblclick', () => {
            document.fullscreenElement ? document.exitFullscreen() : wrapper.requestFullscreen();
        });

        wrapper.setAttribute('tabindex', '0');
        wrapper.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ': case 'k': e.preventDefault(); videoEl.paused ? videoEl.play() : videoEl.pause(); break;
                case 'ArrowLeft': e.preventDefault(); videoEl.currentTime -= 10; break;
                case 'ArrowRight': e.preventDefault(); videoEl.currentTime += 10; break;
                case 'ArrowUp': e.preventDefault(); videoEl.volume = Math.min(1, videoEl.volume + 0.1); break;
                case 'ArrowDown': e.preventDefault(); videoEl.volume = Math.max(0, videoEl.volume - 0.1); break;
                case 'f': e.preventDefault(); wrapper.requestFullscreen(); break;
                case 'm': e.preventDefault(); videoEl.muted = !videoEl.muted; break;
            }
        });
    }

    injectStyles() {
        if (this.stylesInjected) return;
        this.stylesInjected = true;
        
        const style = document.createElement('style');
        style.textContent = `
            .hdrezka-player-container { margin: 12px 0; }
            .hdrezka-loading {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                gap: 12px; padding: 40px; color: #888; background: #0a0a0f; border-radius: 12px;
            }
            .hdrezka-spinner {
                width: 32px; height: 32px; border: 3px solid #333;
                border-top: 3px solid #a855f7; border-radius: 50%;
                animation: hdrezka-spin 0.8s linear infinite;
            }
            @keyframes hdrezka-spin { to { transform: rotate(360deg); } }

            .hdrezka-wrapper {
                position: relative; width: 100%; border-radius: 12px;
                overflow: hidden; background: #000; outline: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .hdrezka-wrapper:fullscreen { border-radius: 0; }

            .hdrezka-video { width: 100%; display: block; cursor: pointer; }

            .hdrezka-controls {
                position: absolute; bottom: 0; left: 0; right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.85));
                padding: 30px 12px 8px; opacity: 0; transition: opacity 0.3s;
            }
            .hdrezka-wrapper:hover .hdrezka-controls,
            .hdrezka-wrapper:focus-within .hdrezka-controls { opacity: 1; }

            .hdrezka-progress-wrap { padding: 8px 0; cursor: pointer; }
            .hdrezka-progress-bar {
                position: relative; height: 4px; background: rgba(255,255,255,0.2);
                border-radius: 2px; transition: height 0.15s;
            }
            .hdrezka-progress-wrap:hover .hdrezka-progress-bar { height: 6px; }
            .hdrezka-progress-buffer {
                position: absolute; top: 0; left: 0; height: 100%;
                background: rgba(255,255,255,0.15); border-radius: 2px;
            }
            .hdrezka-progress-filled {
                position: absolute; top: 0; left: 0; height: 100%;
                background: #a855f7; border-radius: 2px; z-index: 1;
            }
            .hdrezka-progress-handle {
                position: absolute; top: 50%; width: 14px; height: 14px;
                background: #a855f7; border-radius: 50%;
                transform: translate(-50%, -50%) scale(0); transition: transform 0.15s;
                z-index: 2; box-shadow: 0 0 6px rgba(168,85,247,0.5);
            }
            .hdrezka-progress-wrap:hover .hdrezka-progress-handle { transform: translate(-50%, -50%) scale(1); }

            .hdrezka-bottom-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
            .hdrezka-controls-left, .hdrezka-controls-right { display: flex; align-items: center; gap: 8px; }

            .hdrezka-btn {
                background: none; border: none; color: #fff; cursor: pointer;
                font-size: 16px; padding: 4px 6px; border-radius: 4px;
                transition: background 0.2s, color 0.2s; line-height: 1;
                display: flex; align-items: center; justify-content: center;
            }
            .hdrezka-btn:hover { background: rgba(168,85,247,0.25); color: #c084fc; }

            .hdrezka-play-btn { font-size: 18px; width: 30px; }
            .hdrezka-fullscreen-btn { font-size: 20px; }
            .hdrezka-voice-btn { padding: 4px; color: #aaa; }
            .hdrezka-voice-btn:hover { color: #fff; }

            .hdrezka-time { color: #ccc; font-size: 12px; font-family: 'SF Mono', 'Menlo', monospace; user-select: none; }

            .hdrezka-volume-wrap { display: flex; align-items: center; gap: 4px; }
            .hdrezka-volume-slider {
                width: 0; opacity: 0; transition: width 0.3s, opacity 0.3s;
                accent-color: #a855f7; cursor: pointer; height: 4px; margin: 0; padding: 0;
            }
            .hdrezka-volume-wrap:hover .hdrezka-volume-slider { width: 70px; opacity: 1; }

            .hdrezka-dropdown-wrap { position: relative; }
            .hdrezka-dropdown-menu {
                display: none; position: absolute; bottom: 100%; right: 0; margin-bottom: 8px;
                background: rgba(15,15,20,0.95); backdrop-filter: blur(12px);
                border: 1px solid rgba(168,85,247,0.3); border-radius: 8px;
                padding: 4px; min-width: 80px; z-index: 100;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
                max-height: 250px; overflow-y: auto;
            }
            .hdrezka-dropdown-menu::-webkit-scrollbar { width: 4px; }
            .hdrezka-dropdown-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
            
            .hdrezka-voice-menu { min-width: 180px; right: -40px; }
            
            .hdrezka-dropdown-menu.show { display: block; }
            .hdrezka-dropdown-item {
                padding: 6px 12px; color: #ccc; font-size: 13px;
                border-radius: 4px; cursor: pointer; transition: all 0.15s;
                text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .hdrezka-dropdown-item:hover { background: rgba(168,85,247,0.2); color: #fff; }
            .hdrezka-dropdown-item.active { color: #a855f7; font-weight: 600; }

            .hdrezka-speed-btn, .hdrezka-quality-btn {
                font-size: 12px; font-weight: 600; padding: 3px 8px;
                border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;
                font-family: 'SF Mono', 'Menlo', monospace;
            }
            .hdrezka-quality-btn { border-color: rgba(168,85,247,0.4); color: #c084fc; }
        `;
        document.head.appendChild(style);
    }

    async loadHlsJs() {
        if (window.Hls) return;
        try {
            const pluginDir = this.manifest.dir;
            const basePath = this.app.vault.adapter.basePath;
            const hlsPath = path.join(basePath, pluginDir, 'hls.min.js');
            const hlsCode = fs.readFileSync(hlsPath, 'utf8');
            const script = document.createElement('script');
            script.textContent = hlsCode;
            document.head.appendChild(script);
        } catch (e) { console.error("[HDRezka] Failed to load local HLS.js:", e.message); }
    }

    proxyRequest(targetUrl, reqHeaders, res, redirectCount) {
        if (redirectCount > 5) { res.writeHead(502); res.end('Too many redirects'); return; }

        const target = new URL(targetUrl);
        const isHttps = target.protocol === 'https:';
        const lib = isHttps ? https : http;

        const proxyHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Referer': 'https://rezka.ag/',
            'Connection': 'keep-alive',
        };
        if (reqHeaders.range) proxyHeaders['Range'] = reqHeaders.range;

        const options = {
            hostname: target.hostname,
            port: target.port || (isHttps ? 443 : 80),
            path: target.pathname + (target.search || ''),
            method: 'GET',
            headers: proxyHeaders,
        };

        const proxyReq = lib.request(options, (proxyRes) => {
            if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
                proxyRes.resume();
                this.proxyRequest(new URL(proxyRes.headers.location, targetUrl).toString(), reqHeaders, res, redirectCount + 1);
                return;
            }

            const ct = proxyRes.headers['content-type'] || '';
            if (ct.includes('mpegurl') || ct.includes('m3u8') || targetUrl.includes('.m3u8')) {
                let body = '';
                proxyRes.on('data', chunk => body += chunk.toString());
                proxyRes.on('end', () => {
                    const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
                    const rewritten = body.split('\n').map(line => {
                        line = line.trim();
                        if (line && !line.startsWith('#')) {
                            const fullUrl = (line.startsWith('http://') || line.startsWith('https://')) ? line : baseUrl + line;
                            return `http://127.0.0.1:${this.proxyPort}/proxy?url=${encodeURIComponent(fullUrl)}`;
                        }
                        return line;
                    }).join('\n');
                    res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl', 'Access-Control-Allow-Origin': '*' });
                    res.end(rewritten);
                });
                return;
            }

            const respHeaders = { 'Content-Type': proxyRes.headers['content-type'] || 'video/mp2t', 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' };
            if (proxyRes.headers['content-length']) respHeaders['Content-Length'] = proxyRes.headers['content-length'];
            if (proxyRes.headers['content-range']) respHeaders['Content-Range'] = proxyRes.headers['content-range'];
            res.writeHead(proxyRes.statusCode, respHeaders);
            proxyRes.pipe(res);
            res.on('close', () => proxyRes.destroy());
        });

        proxyReq.on('error', (e) => {
            if (!res.headersSent) { res.writeHead(502); res.end('Proxy error: ' + e.message); }
        });
        proxyReq.end();
    }

    startProxyServer() {
        return new Promise((resolve) => {
            this.proxyServer = http.createServer((req, res) => {
                const parsed = nodeUrl.parse(req.url, true);
                if (parsed.pathname === '/video') {
                    const targetUrl = this.videoUrls[parsed.query.id];
                    if (!targetUrl) { res.writeHead(404); res.end('Not found'); return; }
                    this.proxyRequest(targetUrl, req.headers, res, 0);
                } else if (parsed.pathname === '/proxy') {
                    if (!parsed.query.url) { res.writeHead(400); res.end('Missing url'); return; }
                    this.proxyRequest(parsed.query.url, req.headers, res, 0);
                } else { res.writeHead(404); res.end('Not found'); }
            });
            this.proxyServer.on('error', (e) => console.error('[HDRezka Proxy] Error:', e.message));
            this.proxyServer.listen(0, '127.0.0.1', () => {
                this.proxyPort = this.proxyServer.address().port;
                console.log(`[HDRezka Proxy] Running on http://127.0.0.1:${this.proxyPort}`);
                resolve();
            });
        });
    }

    onunload() {
        if (this.proxyServer) { this.proxyServer.close(); console.log("[HDRezka Proxy] Stopped."); }
    }
}

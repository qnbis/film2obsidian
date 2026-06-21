chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveToObsidian') {
        saveToObsidian(request).then(result => {
            sendResponse(result);
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true; // Указываем, что ответ будет асинхронным
    } else if (request.action === 'checkFileExists') {
        checkFileExists(request).then(exists => {
            sendResponse({ success: true, exists: exists });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }
});

async function checkFileExists(request) {
    const items = await chrome.storage.local.get({
        apiKey: '',
        apiUrl: 'http://127.0.0.1:27123',
        basePath: 'Фильмы и Сериалы'
    });

    if (!items.apiKey) return false;

    const authHeader = `Bearer ${items.apiKey}`;
    const baseUrl = items.apiUrl.replace(/\/$/, '');
    const basePath = items.basePath ? `${items.basePath.replace(/\/$/, '')}/` : '';
    
    const mdPath = `${basePath}${request.folder}/${request.mdFilename}`;
    const encodedPath = mdPath.split('/').map(encodeURIComponent).join('/');
    const url = `${baseUrl}/vault/${encodedPath}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': authHeader }
        });
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function saveToObsidian(request) {
    const items = await chrome.storage.local.get({
        apiKey: '',
        apiUrl: 'http://127.0.0.1:27123',
        basePath: 'Фильмы и Сериалы'
    });

    if (!items.apiKey) {
        throw new Error('API Key не настроен. Пожалуйста, откройте настройки расширения, чтобы указать ключ от Local REST API.');
    }

    const authHeader = `Bearer ${items.apiKey}`;
    const baseUrl = items.apiUrl.replace(/\/$/, '');
    const basePath = items.basePath ? `${items.basePath.replace(/\/$/, '')}/` : '';
    
    // Функция для загрузки файла по API
    async function uploadFile(path, content, contentType) {
        // Кодируем каждый сегмент пути, чтобы пробелы и спецсимволы стали безопасными (например, %20)
        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        const url = `${baseUrl}/vault/${encodedPath}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader,
                'Content-Type': contentType
            },
            body: content
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ошибка API Obsidian (${response.status}): ${errText}`);
        }
    }

    // 1. Загрузка постера
    let posterWarning = '';
    if (request.posterUrl) {
        try {
            // Используем кэш браузера, так как картинка уже загружена на странице,
            // и прерываем запрос через 8 секунд, если интернет висит
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const imgRes = await fetch(request.posterUrl, { 
                cache: "force-cache",
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
            const imgBlob = await imgRes.blob();
            
            const posterPath = `${basePath}${request.folder}/Постеры/${request.posterFilename}`;
            await uploadFile(posterPath, imgBlob, imgBlob.type || 'image/jpeg');
        } catch (e) {
            console.warn("Не удалось загрузить постер:", e);
            posterWarning = "\n(Внимание: постер не сохранен из-за ошибки сети/таймаута)";
        }
    }

    if (request.onlyPoster) {
        if (posterWarning) {
            return { success: false, error: "Не удалось сохранить постер: превышено время ожидания или ошибка сети." };
        }
        return { success: true, message: "Постер успешно сохранен в Obsidian!" };
    }

    // 2. Загрузка Markdown заметки
    if (request.markdownContent) {
        const mdPath = `${basePath}${request.folder}/${request.mdFilename}`;
        await uploadFile(mdPath, request.markdownContent, 'text/markdown');
    }

    return { success: true, message: "Успешно сохранено в Obsidian!" + posterWarning };
}

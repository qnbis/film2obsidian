chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveToObsidian') {
        saveToObsidian(request).then(result => {
            sendResponse(result);
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true; // Указываем, что ответ будет асинхронным
    }
});

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
    if (request.posterUrl) {
        try {
            const imgRes = await fetch(request.posterUrl);
            if (!imgRes.ok) throw new Error(`Не удалось скачать картинку с сайта: HTTP ${imgRes.status}`);
            const imgBlob = await imgRes.blob();
            
            const posterPath = `${basePath}${request.folder}/Постеры/${request.posterFilename}`;
            await uploadFile(posterPath, imgBlob, imgBlob.type || 'image/jpeg');
        } catch (e) {
            console.warn("Не удалось загрузить постер:", e);
            throw new Error("Сбой при сохранении постера: " + e.message);
        }
    }

    if (request.onlyPoster) {
        return { success: true, message: "Постер успешно сохранен в Obsidian!" };
    }

    // 2. Загрузка Markdown заметки
    if (request.markdownContent) {
        const mdPath = `${basePath}${request.folder}/${request.mdFilename}`;
        await uploadFile(mdPath, request.markdownContent, 'text/markdown');
    }

    return { success: true, message: "Успешно сохранено в Obsidian!" };
}

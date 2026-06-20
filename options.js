document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);

function saveOptions() {
    const apiKey = document.getElementById('apiKey').value;
    const apiUrl = document.getElementById('apiUrl').value;
    const basePath = document.getElementById('basePath').value;

    chrome.storage.local.set({
        apiKey: apiKey,
        apiUrl: apiUrl,
        basePath: basePath
    }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    });
}

function restoreOptions() {
    chrome.storage.local.get({
        apiKey: '',
        apiUrl: 'http://127.0.0.1:27123',
        basePath: 'Фильмы и Сериалы'
    }, (items) => {
        document.getElementById('apiKey').value = items.apiKey;
        document.getElementById('apiUrl').value = items.apiUrl;
        document.getElementById('basePath').value = items.basePath;
    });
}

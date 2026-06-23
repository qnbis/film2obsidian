document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('movieContainer');

    function renderMovies() {
        chrome.storage.local.get({ recentMovies: [] }, (result) => {
            const movies = result.recentMovies;

            if (movies.length === 0) {
                container.innerHTML = '<div class="empty-state">Вы еще не сохраняли фильмы</div>';
                return;
            }

            container.innerHTML = '';
            movies.forEach((movie, index) => {
                const item = document.createElement('div');
                item.className = 'movie-item';
                
                const date = new Date(movie.timestamp).toLocaleString('ru-RU', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                });

                item.innerHTML = `
                    <div class="movie-title">${movie.title}</div>
                    <div class="movie-date">${date}</div>
                    <div class="actions">
                        <button class="btn btn-open" data-index="${index}">📁 Открыть</button>
                        <button class="btn btn-delete" data-index="${index}">🗑 Удалить</button>
                    </div>
                `;
                container.appendChild(item);
            });

            // Навешиваем слушатели на кнопки
            document.querySelectorAll('.btn-open').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.target.getAttribute('data-index');
                    const m = movies[idx];
                    chrome.runtime.sendMessage({ action: 'openFile', path: m.path });
                });
            });

            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.target.getAttribute('data-index');
                    const m = movies[idx];
                    
                    e.target.textContent = 'Удаление...';
                    e.target.disabled = true;

                    chrome.runtime.sendMessage({ action: 'deleteFile', path: m.path, index: idx }, (response) => {
                        if (response && response.success) {
                            renderMovies(); // Обновляем список
                        } else {
                            alert('Ошибка при удалении: ' + (response ? response.error : 'Неизвестная ошибка'));
                            e.target.textContent = '🗑 Удалить';
                            e.target.disabled = false;
                        }
                    });
                });
            });
        });
    }

    renderMovies();

    const btnGenerateBase = document.getElementById('btnGenerateBase');
    if (btnGenerateBase) {
        btnGenerateBase.addEventListener('click', () => {
            const originalText = btnGenerateBase.textContent;
            btnGenerateBase.textContent = 'Создание...';
            btnGenerateBase.disabled = true;

            chrome.runtime.sendMessage({ action: 'generateBaseFile' }, (response) => {
                if (response && response.success) {
                    btnGenerateBase.textContent = 'Готово! ✓';
                    btnGenerateBase.style.backgroundColor = '#4CAF50';
                    setTimeout(() => {
                        btnGenerateBase.textContent = originalText;
                        btnGenerateBase.style.backgroundColor = '#7e57c2';
                        btnGenerateBase.disabled = false;
                    }, 2000);
                } else {
                    alert('Ошибка: ' + (response ? response.error : 'Неизвестная ошибка'));
                    btnGenerateBase.textContent = originalText;
                    btnGenerateBase.disabled = false;
                }
            });
        });
    }
});

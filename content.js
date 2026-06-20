// Скрипт для сохранения информации о фильмах/сериалах в Obsidian
(function () {
    // Создаем кнопку
    const button = document.createElement('button');
    button.textContent = 'Сохранить в Obsidian';
    button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 10px 15px;
        background: #7e57c2;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-family: Arial, sans-serif;
    `;

    // Создаем вторую кнопку для скачивания только постера
    const buttonPoster = document.createElement('button');
    buttonPoster.textContent = 'Скачать только постер';
    buttonPoster.style.cssText = `
        position: fixed;
        top: 65px;
        right: 20px;
        z-index: 10000;
        padding: 10px 15px;
        background: #26a69a;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-family: Arial, sans-serif;
        display: none;
    `;

    function askUserRating(title, defaultRating) {
        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); z-index: 100000;
                display: flex; align-items: center; justify-content: center;
                font-family: Arial, sans-serif; backdrop-filter: blur(5px);
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: #222; padding: 25px; border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 320px;
                color: #fff; text-align: center; border: 1px solid #444;
            `;

            const header = document.createElement('h3');
            header.textContent = 'Оцените фильм/сериал';
            header.style.cssText = 'margin: 0 0 10px 0; font-size: 18px; color: #fff; font-weight: bold;';

            const desc = document.createElement('p');
            desc.textContent = `«${title}»`;
            desc.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: #aaa; line-height: 1.4;';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `По умолчанию: ${defaultRating || '-'}`;
            input.style.cssText = `
                width: 100%; padding: 12px; box-sizing: border-box;
                border-radius: 6px; border: 1px solid #555; background: #111;
                color: #fff; font-size: 16px; margin-bottom: 20px; text-align: center;
                outline: none; transition: border-color 0.2s;
            `;
            input.onfocus = () => input.style.borderColor = '#7e57c2';
            input.onblur = () => input.style.borderColor = '#555';

            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display: flex; gap: 10px; justify-content: space-between;';

            const btnCancel = document.createElement('button');
            btnCancel.textContent = 'Пропустить';
            btnCancel.style.cssText = `
                flex: 1; padding: 12px; border: none; border-radius: 6px;
                background: #444; color: #fff; cursor: pointer; font-size: 14px;
                transition: background 0.2s;
            `;
            btnCancel.onmouseover = () => btnCancel.style.background = '#555';
            btnCancel.onmouseout = () => btnCancel.style.background = '#444';

            const btnSubmit = document.createElement('button');
            btnSubmit.textContent = 'Сохранить';
            btnSubmit.style.cssText = `
                flex: 1; padding: 12px; border: none; border-radius: 6px;
                background: #7e57c2; color: #fff; cursor: pointer; font-size: 14px;
                font-weight: bold; transition: background 0.2s;
            `;
            btnSubmit.onmouseover = () => btnSubmit.style.background = '#673ab7';
            btnSubmit.onmouseout = () => btnSubmit.style.background = '#7e57c2';

            btnContainer.appendChild(btnCancel);
            btnContainer.appendChild(btnSubmit);
            modal.appendChild(header);
            modal.appendChild(desc);
            modal.appendChild(input);
            modal.appendChild(btnContainer);
            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);

            input.focus();

            const closeAndResolve = (val) => {
                document.body.removeChild(backdrop);
                resolve(val);
            };

            btnCancel.onclick = () => closeAndResolve(null);
            btnSubmit.onclick = () => closeAndResolve(input.value);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') closeAndResolve(input.value);
                if (e.key === 'Escape') closeAndResolve(null);
            };
        });
    }

    const handleSave = async function (onlyPoster) {
        try {
            // Определяем тип (фильм или сериал)
            const isSeries = window.location.href.includes('https://rezka.ag/series/');
            const type = isSeries ? 'Сериал' : 'Фильм';
            const folder = isSeries ? 'Сериалы' : 'Фильмы';

            // Ищем основной контейнер с информацией
            const infoContainer = document.querySelector('.b-post__info') ||
                document.querySelector('.b-post__info_text') ||
                document.querySelector('.b-post__description');

            if (!infoContainer) {
                alert('Не найден контейнер с информацией о фильме');
                return;
            }

            const pageText = infoContainer.textContent;

            // Извлекаем название из заголовка страницы или h1
            let title = '';
            const titleMatch = document.title.match(/Смотреть\s+(?:фильм|сериал)\s+(.+?)\s+онлайн/);
            if (titleMatch) {
                title = titleMatch[1].trim();
            } else {
                // Альтернативный способ - ищем в h1
                const h1 = document.querySelector('h1');
                if (h1) {
                    const h1Match = h1.textContent.match(/Смотреть\s+(?:фильм|сериал)\s+(.+?)\s+онлайн/);
                    if (h1Match) {
                        title = h1Match[1].trim();
                    } else {
                        // Берем текст h1 без префикса
                        title = h1.textContent.replace(/Смотреть\s+(?:фильм|сериал)\s+/i, '')
                            .replace(/\s+онлайн.*/i, '')
                            .trim();
                    }
                }
            }

            // Если не нашли через шаблон, берем из title
            if (!title) {
                title = document.title.replace(' - смотреть онлайн - rezka.ag', '')
                    .replace(' - смотреть онлайн - HDrezka', '')
                    .trim();
            }

            // Извлекаем рейтинги
            const ratingsMatch = pageText.match(/Рейтинги:\s*IMDb:\s*([\d.]+)\s*\(([\d\s]+)\)\s*Кинопоиск:\s*([\d.]+)\s*\(([\d\s]+)\)/);
            const imdbRating = ratingsMatch ? ratingsMatch[1] : '';
            const kpRating = ratingsMatch ? ratingsMatch[3] : '';

            // Извлекаем год
            const yearMatch = pageText.match(/Дата выхода:[\s\S]{0,50}?(\d{4})/i);
            const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

            // Извлекаем страну
            const countryMatch = pageText.match(/Страна:\s*([^\n]+?)(?=\s*(?:Режиссер|Жанр|$))/);
            const countries = countryMatch ? countryMatch[1].split(',').map(c => c.trim()).filter(c => c) : [];

            // Извлекаем режиссера
            const directorMatch = pageText.match(/Режиссер:\s*([^\n]+?)(?=\s*(?:Жанр|Слоган|В качестве|$))/);
            const directors = directorMatch ? directorMatch[1].split(',').map(d => d.trim()).filter(d => d) : [];

            // Извлекаем жанры
            const genreMatch = pageText.match(/Жанр:\s*([^\n]+?)(?=\s*(?:В качестве|Слоган|Время|$))/);
            const genres = genreMatch ? genreMatch[1].split(',').map(g => g.trim()).filter(g => g && !g.includes('В качестве')) : [];

            // Извлекаем актеров
            const actorsMatch = pageText.match(/В ролях актеры:\s*([^\n]+?)(?=\s*(?:Про что|$))/);
            let actors = [];
            if (actorsMatch) {
                actors = actorsMatch[1].split(',')
                    .map(a => a.replace(/и другие.*$/, '').trim())
                    .filter(a => a && a.length > 0 && !a.includes('Про что'));
            }

            // Рассчитываем общий рейтинг
            let overallRating = '';
            if (imdbRating && kpRating) {
                overallRating = Math.round((parseFloat(imdbRating) + parseFloat(kpRating)) / 2).toString();
            } else if (imdbRating) {
                overallRating = Math.round(parseFloat(imdbRating)).toString();
            } else if (kpRating) {
                overallRating = Math.round(parseFloat(kpRating)).toString();
            }

            // Формируем содержимое файла
            let content = '---\n';
            content += `Тип: "[[${type}]]"\n`;
            content += `Год: "[[${year}]]"\n`;

            // Жанры
            if (genres.length > 0) {
                content += 'Жанр:\n';
                genres.forEach(genre => {
                    if (genre && !genre.includes('В качестве') && !genre.includes('В переводе')) {
                        content += `  - "[[${genre}]]"\n`;
                    }
                });
            }

            // Рейтинг
            if (overallRating) {
                content += `Рейтинг: "[[${overallRating}]]"\n`;
            }

            // Страны
            if (countries.length > 0) {
                content += 'Страна:\n';
                countries.forEach(country => {
                    if (country && !country.includes('Режиссер')) {
                        content += `  - "[[${country}]]"\n`;
                    }
                });
            }

            // Режиссеры
            if (directors.length > 0) {
                content += 'Режжисёр:\n';
                directors.forEach(director => {
                    if (director && !director.includes('Жанр')) {
                        content += `  - "[[${director}]]"\n`;
                    }
                });
            }

            // Актеры (первые 10)
            if (actors.length > 0) {
                content += 'Актеры:\n';
                actors.slice(0, 10).forEach(actor => {
                    if (actor && !actor.includes('Про что')) {
                        content += `  - "[[${actor}]]"\n`;
                    }
                });
            }

            // Оценка (запрос у пользователя)
            if (!onlyPoster) {
                const userRating = await askUserRating(title, overallRating);
                if (userRating !== null && userRating.trim() !== "") {
                    content += `Оценка: "[[${userRating.trim()}]]"\n`;
                } else if (overallRating) {
                    content += `Оценка: "[[${overallRating}]]"\n`;
                }
            }

            // Дата добавления
            const today = new Date().toISOString().split('T')[0];
            content += `Когда: ${today}\n`;

            // Настройка имени постера
            const posterName = `${title.toLowerCase().replace(/[^a-z0-9а-яё]/g, '-')}-${year}.jpg`;
            content += `Постер: "[[${posterName}]]"\n`;

            content += '---\n';
            content += `![[${posterName}]]\n`;

            // Ищем постер
            const imgElement = document.querySelector('img[itemprop="image"]');
            const posterUrl = imgElement ? imgElement.src : null;

            if (!posterUrl && onlyPoster) {
                alert('Не удалось найти обложку на странице.');
                return;
            }

            // Очищаем название для имени файла
            const cleanTitle = title.replace(/[<>:"/\\|?*]/g, '');
            const mdFilename = `${cleanTitle} (${year}).md`;

            // Показываем пользователю, что пошел процесс
            const originalBtnText = button.textContent;
            const originalPosterBtnText = buttonPoster.textContent;
            if (onlyPoster) {
                buttonPoster.textContent = 'Сохранение...';
            } else {
                button.textContent = 'Сохранение...';
            }

            // Отправляем данные в background.js для сохранения через Obsidian API
            chrome.runtime.sendMessage({
                action: 'saveToObsidian',
                folder: folder,
                onlyPoster: onlyPoster,
                posterUrl: posterUrl,
                posterFilename: posterName,
                markdownContent: content,
                mdFilename: mdFilename
            }, (response) => {
                if (chrome.runtime.lastError) {
                    button.textContent = originalBtnText;
                    buttonPoster.textContent = originalPosterBtnText;
                    alert('Ошибка связи с расширением: ' + chrome.runtime.lastError.message);
                    console.error(chrome.runtime.lastError);
                } else if (response && !response.success) {
                    button.textContent = originalBtnText;
                    buttonPoster.textContent = originalPosterBtnText;
                    alert('Ошибка при сохранении в Obsidian:\n' + response.error);
                    console.error(response.error);
                } else if (response && response.success) {
                    console.log(response.message);
                    
                    if (onlyPoster) {
                        buttonPoster.textContent = 'Сохранено! ✓';
                        buttonPoster.style.background = '#4CAF50';
                        setTimeout(() => {
                            buttonPoster.textContent = originalPosterBtnText;
                            buttonPoster.style.background = '#26a69a';
                        }, 2000);
                    } else {
                        button.textContent = 'Сохранено! ✓';
                        button.style.background = '#4CAF50';
                        setTimeout(() => {
                            button.textContent = originalBtnText;
                            button.style.background = '#7e57c2';
                        }, 2000);
                    }
                }
            });

            console.log('Сохраненные данные:');
            console.log('- Название:', title);
            console.log('- Тип:', type);
            console.log('- Год:', year);
            console.log('- Жанры:', genres);
            console.log('- Страны:', countries);
            console.log('- Режиссеры:', directors);
            console.log('- Актеры:', actors.slice(0, 10));
            console.log('- Рейтинг:', overallRating);
            console.log(`Файл: ${cleanTitle} (${year}).md`);
            console.log(`Папка: C:\\Users\\01\\Documents\\Obsidian Vault\\Фильмы и Сериалы\\${folder}\\`);

        } catch (error) {
            console.error('Ошибка при сохранении:', error);
            alert('Произошла ошибка при сохранении. Проверьте консоль для подробностей.');
        }
    };

    button.onclick = () => handleSave(false);
    buttonPoster.onclick = () => handleSave(true);

    // Добавляем кнопки на страницу
    document.body.appendChild(button);
    document.body.appendChild(buttonPoster);

    console.log('Скрипт загружен! Кнопки добавлены в правый верхний угол.');
})();
# Obsidian Film Saver

A Google Chrome extension that allows you to save movies and series from **HDrezka** (rezka.ag) directly to your **Obsidian** knowledge base with a single click.

## Features
- Automatically scrapes movie/series metadata (title, year, genres, countries, directors, actors, IMDb & Kinopoisk ratings).
- Beautiful custom modal to input your personal rating.
- Downloads the movie poster/cover automatically.
- Seamlessly sends the `.md` note and poster file directly to your Obsidian Vault via local network (no downloads folder clutter or "Save As" popups).
- Success animation on the save button.

## How it works?
The extension utilizes the **Local REST API** plugin to communicate with Obsidian directly. You click the button on the site -> the extension generates a note -> sends the files straight to your Obsidian Vault.

## Installation & Setup

### 1. Obsidian Setup
1. Open Obsidian and go to **Settings** -> **Community plugins**.
2. Turn off "Restricted mode".
3. Click **Browse** and search for `Local REST API`.
4. Install and enable it.
5. Go to the settings of the Local REST API plugin and:
   - **Enable:** `Enable Non-Encrypted (HTTP) Server`.
   - **Copy the `API Key`** provided there.

### 2. Extension Installation
1. Download the code of this repository.
2. In your browser (Google Chrome, Edge, Brave), go to: `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing this extension.

### 3. Extension Setup
1. Right-click the extension icon on your taskbar (or find it on the extensions page) and click **Options**.
2. Paste the **API Key** you copied from Obsidian.
3. **IMPORTANT:** Make sure the "Server Address" field is exactly `http://127.0.0.1:27123` (ending with 3, as this is the HTTP server port).
4. Click "Save".

Done! Now visit any movie page on HDrezka, refresh it, and click "Сохранить в Obsidian" (Save to Obsidian).

## Obsidian Folder Structure
By default, the extension saves movies to:
- `Фильмы и Сериалы/Фильмы/Movie Name (Year).md`
- Posters are saved to `Фильмы и Сериалы/Фильмы/Постеры/...`

You can easily change the base folder (`Фильмы и Сериалы`) in the extension options.

---

<h1 id="obsidian-film-saver-ru">Obsidian Film Saver (RU)</h1>

Расширение для Google Chrome, которое позволяет сохранять фильмы и сериалы с сайта **HDrezka** (rezka.ag) напрямую в вашу базу знаний **Obsidian** одним кликом.

## Возможности

- Автоматический сбор данных о фильме/сериале (название, год, жанры, страны, режиссеры, актеры, рейтинги IMDb и Кинопоиск).
- Красивое всплывающее окно для добавления вашей личной оценки.
- Скачивание постера (обложки) в нужном формате.
- Прямая бесшовная загрузка `.md` заметки и файла постера в ваш Vault по локальной сети.
- Анимация успешного сохранения.
- Отсутствие всплывающих окон сохранения ("Сохранить как...") и засорения папки "Загрузки".

## Как это работает?

Расширение использует плагин **Local REST API** для связи с Obsidian напрямую. Вы нажимаете кнопку на сайте -> расширение формирует заметку -> отправляет файлы прямо в Obsidian.

## Установка и настройка

### 1. Настройка Obsidian
1. Откройте Obsidian и зайдите в **Настройки** -> **Community plugins** (Сторонние плагины).
2. Выключите "Restricted mode" (Безопасный режим).
3. Нажмите кнопку **Browse** (Обзор) и найдите плагин `Local REST API`.
4. Установите и включите его.
5. Зайдите в настройки этого плагина (Local REST API) и:
   - **Включите настройку:** `Enable Non-Encrypted (HTTP) Server` (Включить незашифрованный сервер).
   - **Скопируйте `API Key`**, который там написан.

### 2. Установка расширения
1. Скачайте код этого проекта.
2. В браузере (Google Chrome, Яндекс Браузер, Edge) перейдите по адресу: `chrome://extensions/`.
3. В правом верхнем углу включите тумблер **«Режим разработчика»** (Developer mode).
4. Нажмите кнопку **«Загрузить распакованное расширение»** (Load unpacked) и выберите папку с этим расширением.

### 3. Настройка расширения
1. Нажмите правой кнопкой мыши по иконке расширения на панели задач (или найдите его на странице расширений) и выберите **«Параметры»** (Options).
2. Вставьте скопированный из Obsidian **API Key**.
3. **ВАЖНО:** Убедитесь, что в поле "Адрес сервера" указано именно `http://127.0.0.1:27123` (с цифрой 3 на конце, так как это порт для HTTP сервера).
4. Нажмите "Сохранить".

Готово! Теперь зайдите на любую страницу фильма на HDrezka, обновите её, и нажмите кнопку «Сохранить в Obsidian».

## Структура папок в Obsidian
По умолчанию расширение сохраняет фильмы по пути:
- `Фильмы и Сериалы/Фильмы/Имя Фильма (Год).md`
- Постер сохраняется в `Фильмы и Сериалы/Фильмы/Постеры/...`

Базовую папку (`Фильмы и Сериалы`) можно легко поменять в настройках расширения.

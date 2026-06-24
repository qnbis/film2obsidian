<div align="center">

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Google Chrome](https://img.shields.io/badge/Google_Chrome-4285F4?logo=google-chrome&logoColor=white)
![Obsidian](https://img.shields.io/badge/Obsidian-483699?logo=obsidian&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)

<br>

🇷🇺 [Читать на русском](./README.md)

</div>

# Obsidian Film Saver + HDRezka Player 🍿

A comprehensive solution for integrating movies and TV series from **HDrezka (rezka.ag)** into your **Obsidian** knowledge base. 

Consists of two components:
1. **Chrome Extension (Obsidian Film Saver)**: Allows you to save a movie page with all metadata (title, year, genres, ratings) and cover art directly to your Vault with one click.
2. **Obsidian Plugin (HDRezka Player)**: Allows you to **watch** saved movies directly inside Obsidian notes in a beautiful built-in player (supports HLS, quality selection, voiceovers, and speed control).

---

## 🌟 Features

### Browser Extension
- 📥 Automatic extraction of movie/series data (title, year, genres, countries, directors, actors, IMDb and Kinopoisk ratings).
- 🎨 Beautiful Glassmorphism popup UI for adding personal ratings and viewing recently saved movies.
- 🖼 Downloading posters (covers) in the required format.
- 🚀 Direct seamless upload of the `.md` note and poster file to your Vault over the local network via Local REST API.

### Obsidian Plugin (HDRezka Player)
- 🍿 **Built-in Player**: Play videos directly in Obsidian using a rezka.ag link.
- 🎭 **Voiceover Selection**: Switch translations/voiceovers directly in the player without reloading the page.
- 📺 **Quality Selection**: Dynamic quality switching (from 360p up to 1080p).
- 🚀 **Speed Control**: Speed up or slow down playback.
- 💅 **Premium Design**: Custom dark interface with purple accents, blur effects, and a convenient progress bar.
- 🛡 **CORS Bypass**: Built-in local proxy server ensures uninterrupted video loading even with strict network restrictions.

---

## ⚙️ Installation and Setup

### 1. Obsidian Setup
1. Open Obsidian and go to **Settings** -> **Community plugins**.
2. Turn off "Restricted mode".
3. Click the **Browse** button and find the `Local REST API` plugin. Install and enable it.
4. In the Local REST API settings:
   - **Enable:** `Enable Non-Encrypted (HTTP) Server`.
   - **Copy the `API Key`** (copy only the key itself, without the word `Bearer`).

### 2. Browser Extension Installation
1. Download this repository.
2. In Chrome, go to: `chrome://extensions/`.
3. Enable **"Developer mode"**.
4. Click **"Load unpacked"** and select the root folder of the repository.
5. Right-click the extension icon -> **"Options"**.
6. Paste your `API Key` from Obsidian and save.

### 3. HDRezka Player Plugin Installation in Obsidian
1. In your Obsidian Vault, navigate to the `.obsidian/plugins/` folder.
2. Simply copy the `obsidian-hdrezka-player` folder from this repository into the `plugins` folder.
3. Restart Obsidian (or refresh the plugin list) and enable the **HDRezka Player** plugin.

---

## 💻 Usage

1. Go to any movie page on the HDrezka website (e.g., `rezka.ag/films/...`).
2. Click the extension icon in your browser and click "Save to Obsidian" 🎬.
3. The extension will create a note in your Vault and **automatically** embed the movie's video player inside it. You just need to open the note in Obsidian and enjoy watching!

---

## 📁 Folder Structure in Obsidian
By default, the extension saves movies to the following path:
- `Фильмы и Сериалы/Фильмы/Movie Name (Year).md`
- The poster is saved in `Фильмы и Сериалы/Фильмы/Постеры/...`

*(The base folder can be easily changed in the extension settings)*

<div align="center">

![License MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)
![Claude Code Skill](https://img.shields.io/badge/Claude_Code-Skill-blueviolet.svg)
![Codex AGENTS.md](https://img.shields.io/badge/Codex-AGENTS.md-brightgreen.svg)
![NotebookLM API Control](https://img.shields.io/badge/NotebookLM-API_Control-orange.svg)
![LLM Wiki Compiled Knowledge](https://img.shields.io/badge/LLM_Wiki-Compiled_Knowledge-teal.svg)

![FTS5 Vault Memory](https://img.shields.io/badge/FTS5-Vault_Memory-lightblue.svg)

</div>

---

<div align="center">

🇷🇺 [Читать на русском → README.md](./README.md)

</div>

---

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

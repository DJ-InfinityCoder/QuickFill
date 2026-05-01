# QuickFill — Placement Form Autofiller

![QuickFill Logo](./assets/quick_fill.png)

**QuickFill** is a production-ready Chrome Extension designed to automate filling Google Forms circulated by college T&P (Training & Placement) Cells for company placement drives.

## 🚀 Installation (100% Free)

Since this is a student project, you can install it for free without using the Chrome Web Store:

1. **Download**: Go to the [Latest Release](https://github.com/${{ github.repository }}/releases/tag/latest) and download `QuickFill-Production.zip`.
2. **Extract**: Unzip the file into a folder on your computer.
3. **Open Chrome Extensions**: Type `chrome://extensions/` in your browser address bar.
4. **Developer Mode**: Toggle the **Developer mode** switch in the top right corner.
5. **Load Unpacked**: Click the **Load unpacked** button and select the folder you extracted.

---

## 🛠 Features

- ⚡ **Smart Autofill**: Automatically detects and fills fields in Google Forms.
- 👤 **Profile Management**: Save your student details once and use them for every form.
- 🧠 **Intelligent Matching**: Uses fuzzy matching to map form questions to your profile data.
- 🔒 **Privacy First**: All your sensitive data is stored locally on your machine. Nothing is sent to any server.

## Tech Stack

- **Framework**: [Plasmo](https://docs.plasmo.com/)
- **UI**: React + Tailwind CSS
- **Storage**: chrome.storage.local
- **Language**: TypeScript

## Getting Started

1. Clone this repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run the development server:
   ```bash
   pnpm dev
   ```
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` folder.

## Build for Production

```bash
pnpm build
```

The production-ready bundle will be in `build/chrome-mv3-prod`.

---
Developed by Dilip Meghwal for NIT Delhi students.


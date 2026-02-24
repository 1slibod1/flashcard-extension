# 🃏 AI Flashcard Generator — Setup Guide

## Your folder structure should look like this:

```
flashcard-extension/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── api/
│   └── flashcards.js   ← Vercel backend
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Step 1 — Deploy your backend to Vercel

1. Go to https://github.com and create a **new repository** (call it `flashcard-extension`)
2. Upload all your files to the repo
3. Go to https://vercel.com and sign up (free)
4. Click **"Add New Project"** → import your GitHub repo
5. In the project settings, go to **"Environment Variables"** and add:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-...` (paste your actual key here)
6. Click **Deploy**
7. Vercel will give you a URL like: `https://flashcard-extension-abc123.vercel.app`

---

## Step 2 — Update background.js with your Vercel URL

Open `background.js` and find this line at the top:

```
const SERVER_URL = "https://YOUR-APP-NAME.vercel.app/api/flashcards";
```

Replace it with your actual Vercel URL, for example:

```
const SERVER_URL = "https://flashcard-extension-abc123.vercel.app/api/flashcards";
```

---

## Step 3 — Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select your `flashcard-extension/` folder
5. Done! 🎉

---

## How users use it

1. Select any text on a webpage
2. Right-click → **✨ Generate Flashcards from Selection**
3. A `.json` file downloads automatically — no setup needed for users!

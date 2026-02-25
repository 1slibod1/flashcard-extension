// background.js - Service worker for AI Flashcard Generator
// NOTE: Replace YOUR-APP-NAME below with your actual Vercel app name after deploying

const SERVER_URL = "https://YOUR-APP-NAME.vercel.app/api/flashcards";

// Create context menu item on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateFlashcards",
    title: "✨ Generate Flashcards from Selection",
    contexts: ["selection"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "generateFlashcards") {
    const selectedText = info.selectionText;
    if (!selectedText || selectedText.trim().length === 0) return;

    // Set loading status
    chrome.storage.local.set({ status: "loading", selectedText });

    try {
      const flashcards = await generateFlashcards(selectedText);
      chrome.storage.local.set({ status: "done", flashcards, lastGenerated: new Date().toISOString() });

      // Only download if user has enabled it
      chrome.storage.local.get("downloadJson", ({ downloadJson }) => {
        if (downloadJson === true) downloadFlashcards(flashcards);
      });

    } catch (err) {
      chrome.storage.local.set({ status: "error", error: err.message });
    }
  }
});

// Call your Vercel backend to generate flashcards
async function generateFlashcards(text) {
  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Server error — please try again");
  }

  const data = await response.json();
  return data.flashcards;
}

// Trigger a JSON file download
function downloadFlashcards(flashcards) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `flashcards-${timestamp}.json`;

  const output = {
    generated: new Date().toISOString(),
    count: flashcards.length,
    flashcards
  };

  const dataUrl = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(output, null, 2));

  chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: false
  });
}
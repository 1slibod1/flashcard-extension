// popup.js

const statusArea = document.getElementById("status-area");

// Poll for status updates from background worker
function checkStatus() {
  chrome.storage.local.get(["status", "error", "flashcards"], ({ status, error, flashcards }) => {
    if (status === "loading") {
      statusArea.className = "loading";
      statusArea.innerHTML = `<div class="spinner"></div><span>Generating flashcards...</span>`;
    } else if (status === "error") {
      statusArea.className = "error";
      statusArea.innerHTML = `⚠️ ${error || "Something went wrong."}`;
    } else if (status === "done" && flashcards) {
      statusArea.className = "done";
      const preview = flashcards.slice(0, 3).map(c => `
        <div class="card-item">
          <div class="card-front">▶ ${c.front}</div>
          <div class="card-back">${c.back}</div>
        </div>
      `).join("");
      const more = flashcards.length > 3
        ? `<div style="font-size:11px;color:#4ade8099;margin-top:4px;">+ ${flashcards.length - 3} more cards saved to JSON</div>`
        : "";
      statusArea.innerHTML = `✓ ${flashcards.length} flashcard${flashcards.length !== 1 ? "s" : ""} generated & downloaded!<div class="card-preview">${preview}${more}</div>`;
      chrome.storage.local.remove("status");
    } else {
      statusArea.style.display = "none";
    }
  });
}

checkStatus();
const interval = setInterval(checkStatus, 1000);
window.addEventListener("unload", () => clearInterval(interval));

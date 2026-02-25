// popup.js — Full flashcard study app

// ── DOWNLOAD TOGGLE ────────────────────────────────────
const downloadToggle = document.getElementById('download-toggle');

// Load saved preference (default: off)
chrome.storage.local.get('downloadJson', ({ downloadJson }) => {
  downloadToggle.checked = downloadJson === true;
});

// Save on change
downloadToggle.addEventListener('change', () => {
  chrome.storage.local.set({ downloadJson: downloadToggle.checked });
});

// ── STATE ──────────────────────────────────────────────
let decks = {};        // { deckId: { name, cards: [{front,back}] } }
let progress = {};     // { deckId: { cardIndex: 'known' | 'learning' } }
let currentDeckId = null;
let studyCards = [];
let studyIndex = 0;
let studyKnown = 0;

// ── STORAGE HELPERS ────────────────────────────────────
function saveDecks() { chrome.storage.local.set({ decks }); }
function saveProgress() { chrome.storage.local.set({ progress }); }

function loadAll(cb) {
  chrome.storage.local.get(['decks', 'progress', 'status', 'flashcards', 'error'], (data) => {
    decks = data.decks || {};
    progress = data.progress || {};
    cb(data);
  });
}

// ── TABS ───────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('screen-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'learn') renderLearnDeckList();
    if (tab.dataset.tab === 'quiz') renderQuizDeckList();
    if (tab.dataset.tab === 'progress') renderProgress();
  });
});

// ── HOME — STATUS POLLING ──────────────────────────────
const statusArea = document.getElementById('status-area');

function checkStatus() {
  chrome.storage.local.get(['status', 'error', 'flashcards'], (data) => {
    const { status, error, flashcards } = data;
    if (status === 'loading') {
      statusArea.className = 'status-box loading';
      statusArea.innerHTML = '<div class="spinner"></div><span>Generating flashcards...</span>';
    } else if (status === 'error') {
      statusArea.className = 'status-box error';
      statusArea.innerHTML = '⚠️ ' + (error || 'Something went wrong.');
    } else if (status === 'done' && flashcards) {
      // Save as a new deck
      const deckId = 'deck_' + Date.now();
      const name = 'Deck ' + new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
      decks[deckId] = { name, cards: flashcards };
      saveDecks();
      statusArea.className = 'status-box done';
      statusArea.innerHTML = '✓ ' + flashcards.length + ' flashcards generated! Go to Learn or Quiz to study them.';
      chrome.storage.local.remove('status');
    } else {
      statusArea.className = '';
      statusArea.innerHTML = '';
    }
  });
}

checkStatus();
const pollInterval = setInterval(checkStatus, 1000);
window.addEventListener('unload', () => clearInterval(pollInterval));

// ── DECK LIST HELPER ───────────────────────────────────
function renderDeckList(containerId, selectedCallback) {
  const container = document.getElementById(containerId);
  const ids = Object.keys(decks);
  if (ids.length === 0) {
    container.innerHTML = '<div class="empty-state">No decks yet.<br>Generate some flashcards on the Home tab first!</div>';
    return null;
  }
  container.innerHTML = '';
  ids.forEach(id => {
    const deck = decks[id];
    const item = document.createElement('div');
    item.className = 'deck-item';
    item.innerHTML = `<div><div class="deck-name">${deck.name}</div><div class="deck-meta">${deck.cards.length} cards</div></div><div class="deck-badge">${deck.cards.length}</div>`;
    item.addEventListener('click', () => {
      container.querySelectorAll('.deck-item').forEach(d => d.classList.remove('selected'));
      item.classList.add('selected');
      selectedCallback(id);
    });
    container.appendChild(item);
  });
  return ids;
}

// ── LEARN MODE ─────────────────────────────────────────
function renderLearnDeckList() {
  const ids = renderDeckList('learn-deck-list', (id) => {
    currentDeckId = id;
    document.getElementById('learn-start-btn').disabled = false;
  });
  document.getElementById('learn-start-btn').disabled = true;
  currentDeckId = null;

  // Reset learn UI
  document.getElementById('learn-deck-select').style.display = 'block';
  document.getElementById('learn-study').style.display = 'none';
  document.getElementById('learn-complete').style.display = 'none';
}

document.getElementById('learn-start-btn').addEventListener('click', () => {
  if (!currentDeckId) return;
  studyCards = [...decks[currentDeckId].cards];
  studyIndex = 0; studyKnown = 0;
  document.getElementById('learn-deck-select').style.display = 'none';
  document.getElementById('learn-study').style.display = 'block';
  document.getElementById('learn-complete').style.display = 'none';
  showLearnCard();
});

function showLearnCard() {
  if (studyIndex >= studyCards.length) {
    showLearnComplete(); return;
  }
  const card = studyCards[studyIndex];
  document.getElementById('learn-front').textContent = card.front;
  document.getElementById('learn-back').textContent = card.back;
  document.getElementById('card-inner').classList.remove('flipped');
  document.getElementById('learn-buttons').style.display = 'none';
  document.getElementById('learn-counter').textContent = `Card ${studyIndex + 1} of ${studyCards.length}`;
}

document.getElementById('card-container').addEventListener('click', () => {
  const inner = document.getElementById('card-inner');
  inner.classList.toggle('flipped');
  if (inner.classList.contains('flipped')) {
    document.getElementById('learn-buttons').style.display = 'flex';
  }
});

document.getElementById('btn-got-it').addEventListener('click', () => {
  const card = studyCards[studyIndex];
  if (!progress[currentDeckId]) progress[currentDeckId] = {};
  progress[currentDeckId][studyIndex] = 'known';
  saveProgress();
  studyKnown++;
  studyIndex++;
  showLearnCard();
});

document.getElementById('btn-still-learning').addEventListener('click', () => {
  if (!progress[currentDeckId]) progress[currentDeckId] = {};
  progress[currentDeckId][studyIndex] = 'learning';
  saveProgress();
  studyIndex++;
  showLearnCard();
});

function showLearnComplete() {
  document.getElementById('learn-study').style.display = 'none';
  document.getElementById('learn-complete').style.display = 'block';
  const total = studyCards.length;
  document.getElementById('learn-complete-sub').textContent =
    `You knew ${studyKnown} out of ${total} cards. ${studyKnown === total ? 'Perfect score! 🌟' : 'Keep practicing!'}`;
}

document.getElementById('learn-again-btn').addEventListener('click', () => {
  studyIndex = 0; studyKnown = 0;
  document.getElementById('learn-study').style.display = 'block';
  document.getElementById('learn-complete').style.display = 'none';
  showLearnCard();
});

// ── QUIZ MODE ──────────────────────────────────────────
let quizDeckId = null;

function renderQuizDeckList() {
  renderDeckList('quiz-deck-list', (id) => {
    quizDeckId = id;
    document.getElementById('quiz-start-btn').disabled = false;
  });
  document.getElementById('quiz-start-btn').disabled = true;
  quizDeckId = null;
  document.getElementById('quiz-deck-select').style.display = 'block';
  document.getElementById('quiz-study').style.display = 'none';
  document.getElementById('quiz-complete').style.display = 'none';
}

let quizCards = [], quizIndex = 0, quizScore = 0;

document.getElementById('quiz-start-btn').addEventListener('click', () => {
  if (!quizDeckId) return;
  quizCards = [...decks[quizDeckId].cards];
  quizIndex = 0; quizScore = 0;
  document.getElementById('quiz-deck-select').style.display = 'none';
  document.getElementById('quiz-study').style.display = 'block';
  document.getElementById('quiz-complete').style.display = 'none';
  showQuizCard();
});

function showQuizCard() {
  if (quizIndex >= quizCards.length) { showQuizComplete(); return; }
  const card = quizCards[quizIndex];
  document.getElementById('quiz-front').textContent = card.front;
  document.getElementById('quiz-back').textContent = card.back;
  document.getElementById('quiz-input').value = '';
  document.getElementById('answer-reveal').classList.remove('visible');
  document.getElementById('quiz-buttons').style.display = 'none';
  document.getElementById('btn-reveal').style.display = 'block';
  document.getElementById('quiz-counter').textContent = `Question ${quizIndex + 1} of ${quizCards.length}`;
}

document.getElementById('btn-reveal').addEventListener('click', () => {
  document.getElementById('answer-reveal').classList.add('visible');
  document.getElementById('quiz-buttons').style.display = 'flex';
  document.getElementById('btn-reveal').style.display = 'none';
});

document.getElementById('quiz-btn-right').addEventListener('click', () => {
  if (!progress[quizDeckId]) progress[quizDeckId] = {};
  progress[quizDeckId][quizIndex] = 'known';
  saveProgress();
  quizScore++; quizIndex++;
  showQuizCard();
});

document.getElementById('quiz-btn-wrong').addEventListener('click', () => {
  if (!progress[quizDeckId]) progress[quizDeckId] = {};
  progress[quizDeckId][quizIndex] = 'learning';
  saveProgress();
  quizIndex++;
  showQuizCard();
});

function showQuizComplete() {
  document.getElementById('quiz-study').style.display = 'none';
  document.getElementById('quiz-complete').style.display = 'block';
  const pct = Math.round((quizScore / quizCards.length) * 100);
  document.getElementById('quiz-complete-sub').textContent =
    `You scored ${quizScore}/${quizCards.length} (${pct}%). ${pct >= 80 ? 'Great job! 🌟' : pct >= 50 ? 'Good effort, keep going!' : 'Keep practicing, you\'ll get there!'}`;
}

document.getElementById('quiz-again-btn').addEventListener('click', () => {
  quizIndex = 0; quizScore = 0;
  document.getElementById('quiz-study').style.display = 'block';
  document.getElementById('quiz-complete').style.display = 'none';
  showQuizCard();
});

// ── PROGRESS ───────────────────────────────────────────
function renderProgress() {
  const deckIds = Object.keys(decks);
  let totalCards = 0, totalKnown = 0, totalLearning = 0;

  const listEl = document.getElementById('deck-progress-list');
  listEl.innerHTML = '';

  deckIds.forEach(id => {
    const deck = decks[id];
    const prog = progress[id] || {};
    const known = Object.values(prog).filter(v => v === 'known').length;
    const learning = Object.values(prog).filter(v => v === 'learning').length;
    const total = deck.cards.length;
    const pct = total > 0 ? Math.round((known / total) * 100) : 0;

    totalCards += total;
    totalKnown += known;
    totalLearning += learning;

    const item = document.createElement('div');
    item.className = 'deck-progress-item';
    item.innerHTML = `
      <div class="deck-progress-top">
        <div class="deck-progress-name">${deck.name}</div>
        <div class="deck-progress-pct">${pct}%</div>
      </div>
      <div class="mini-bar-wrap"><div class="mini-bar-fill" style="width:${pct}%"></div></div>
      <div style="font-size:10px;color:#50508a;margin-top:5px;">${known} known · ${learning} learning · ${total - known - learning} unseen</div>
    `;
    listEl.appendChild(item);
  });

  if (deckIds.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No decks yet. Generate some flashcards first!</div>';
  }

  document.getElementById('stat-total').textContent = totalCards;
  document.getElementById('stat-known').textContent = totalKnown;
  document.getElementById('stat-learning').textContent = totalLearning;
  const overallPct = totalCards > 0 ? Math.round((totalKnown / totalCards) * 100) : 0;
  document.getElementById('progress-bar').style.width = overallPct + '%';
}

document.getElementById('btn-reset-progress').addEventListener('click', () => {
  if (confirm('Reset all progress? Your decks will be kept.')) {
    progress = {};
    saveProgress();
    renderProgress();
  }
});

// ── INIT ───────────────────────────────────────────────
loadAll(() => {});
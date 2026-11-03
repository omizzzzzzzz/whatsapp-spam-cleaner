// ── State ──
let foundAccounts = [];
let selectedIds = new Set();
let blockingState = { paused: false, stopped: false };

// ── DOM Refs ──
const screens = {
  landing: document.getElementById('screen-landing'),
  scanning: document.getElementById('screen-scanning'),
  results: document.getElementById('screen-results'),
  empty: document.getElementById('screen-empty'),
  progress: document.getElementById('screen-progress'),
  done: document.getElementById('screen-done'),
  error: document.getElementById('screen-error'),
};

const modal = document.getElementById('modal-warning');

// ── Screen Management ──
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ── Helpers ──
function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function updateSelectedCount() {
  const count = selectedIds.size;
  document.getElementById('count-selected').textContent = `${count} selected`;
  document.getElementById('count-action').textContent = count;
  document.getElementById('btn-block').disabled = count === 0;
}

// ── Render Results ──
function renderResults(accounts) {
  const list = document.getElementById('results-list');
  list.innerHTML = '';

  accounts.forEach(account => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <input type="checkbox" data-id="${account.id}" ${selectedIds.has(account.id) ? 'checked' : ''}>
      <div class="result-avatar">${getInitial(account.name)}</div>
      <div class="result-info">
        <div class="result-name">${account.name}</div>
        <span class="result-badge">Business</span>
      </div>
    `;

    const checkbox = item.querySelector('input[type="checkbox"]');
    item.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      if (checkbox.checked) {
        selectedIds.add(account.id);
      } else {
        selectedIds.delete(account.id);
      }
      updateSelectAll();
      updateSelectedCount();
    });

    list.appendChild(item);
  });
}

function updateSelectAll() {
  const selectAll = document.getElementById('select-all');
  selectAll.checked = selectedIds.size === foundAccounts.length && foundAccounts.length > 0;
  selectAll.indeterminate = selectedIds.size > 0 && selectedIds.size < foundAccounts.length;
}

// ── Progress Log ──
function addLog(message, type = '') {
  const log = document.getElementById('progress-log');
  const item = document.createElement('div');
  item.className = `log-item ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'waiting' ? '⏳' : '→';
  item.textContent = `${icon} ${message}`;
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}

function updateProgress(current, total, name) {
  const pct = Math.round((current / total) * 100);
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('progress-text').textContent = `Blocking ${current}/${total}`;
  document.getElementById('progress-current').textContent = name ? `Currently: ${name}` : '';
}

// ── Communication with Content Script ──
async function sendToContent(action, data = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('web.whatsapp.com')) {
    showScreen('error');
    return null;
  }
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Message error:', chrome.runtime.lastError);
        showScreen('error');
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

// ── Scan ──
async function startScan() {
  showScreen('scanning');

  const response = await sendToContent('scan');
  if (!response) return;

  foundAccounts = response.accounts || [];

  if (foundAccounts.length === 0) {
    showScreen('empty');
  } else {
    selectedIds = new Set(foundAccounts.map(a => a.id));
    document.getElementById('count-found').textContent = foundAccounts.length;
    renderResults(foundAccounts);
    updateSelectAll();
    updateSelectedCount();
    showScreen('results');
  }
}

// ── Block ──
async function startBlocking() {
  modal.classList.remove('active');
  blockingState = { paused: false, stopped: false };
  showScreen('progress');

  const toBlock = foundAccounts.filter(a => selectedIds.has(a.id));
  const total = toBlock.length;
  let blocked = 0;
  let failed = 0;
  const results = [];

  document.getElementById('progress-log').innerHTML = '';
  updateProgress(0, total, '');

  for (let i = 0; i < toBlock.length; i++) {
    // Check if stopped
    if (blockingState.stopped) {
      addLog('Stopped by user', 'error');
      break;
    }

    // Handle pause
    while (blockingState.paused) {
      await new Promise(r => setTimeout(r, 500));
      if (blockingState.stopped) break;
    }
    if (blockingState.stopped) {
      addLog('Stopped by user', 'error');
      break;
    }

    const account = toBlock[i];
    updateProgress(i, total, account.name);
    addLog(`Blocking ${account.name}...`, 'waiting');

    const response = await sendToContent('block', { account });

    if (response && response.success) {
      blocked++;
      results.push({ name: account.name, success: true });
      addLog(`Blocked ${account.name}`, 'success');
    } else {
      failed++;
      results.push({ name: account.name, success: false });
      addLog(`Failed to block ${account.name}`, 'error');
    }

    updateProgress(i + 1, total, '');

    // Random delay 30-60 seconds between blocks (skip after last one)
    if (i < toBlock.length - 1 && !blockingState.stopped) {
      const delay = 30000 + Math.random() * 30000;
      const delaySec = Math.round(delay / 1000);
      addLog(`Waiting ${delaySec}s before next...`, 'waiting');

      const startWait = Date.now();
      while (Date.now() - startWait < delay) {
        if (blockingState.stopped) break;
        while (blockingState.paused && !blockingState.stopped) {
          await new Promise(r => setTimeout(r, 500));
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // Show done screen
  document.getElementById('done-title').textContent = blockingState.stopped ? 'Stopped' : 'Cleaned!';
  document.getElementById('done-subtitle').textContent =
    `${blocked} blocked` + (failed > 0 ? `, ${failed} failed` : '');

  const summary = document.getElementById('done-summary');
  summary.innerHTML = results.map(r =>
    `<div class="done-item ${r.success ? 'success' : 'failed'}">${r.success ? '✓' : '✗'} ${r.name}</div>`
  ).join('');

  showScreen('done');
}

// ── Event Listeners ──
document.getElementById('btn-scan').addEventListener('click', startScan);
document.getElementById('btn-rescan').addEventListener('click', startScan);
document.getElementById('btn-retry').addEventListener('click', () => showScreen('landing'));

document.getElementById('select-all').addEventListener('change', (e) => {
  if (e.target.checked) {
    selectedIds = new Set(foundAccounts.map(a => a.id));
  } else {
    selectedIds.clear();
  }
  renderResults(foundAccounts);
  updateSelectedCount();
});

document.getElementById('btn-block').addEventListener('click', () => {
  if (selectedIds.size > 10) {
    document.querySelector('.modal-content ul li:nth-child(2)').innerHTML =
      `You've selected <strong>${selectedIds.size} accounts</strong> — we recommend max 10 per session for safety`;
  }
  modal.classList.add('active');
});

document.getElementById('btn-confirm-block').addEventListener('click', startBlocking);
document.getElementById('btn-cancel-block').addEventListener('click', () => modal.classList.remove('active'));

document.getElementById('btn-pause').addEventListener('click', () => {
  blockingState.paused = !blockingState.paused;
  const btn = document.getElementById('btn-pause');
  btn.textContent = blockingState.paused ? '▶ Resume' : '⏸ Pause';
  btn.className = blockingState.paused ? 'btn-secondary' : 'btn-warning';
  if (blockingState.paused) {
    addLog('Paused', 'waiting');
  } else {
    addLog('Resumed', '');
  }
});

document.getElementById('btn-stop').addEventListener('click', () => {
  blockingState.stopped = true;
  blockingState.paused = false;
});

document.getElementById('btn-done').addEventListener('click', () => {
  foundAccounts = [];
  selectedIds.clear();
  showScreen('landing');
});

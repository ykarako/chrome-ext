const volEl = document.getElementById('vol');
const valNumEl = document.getElementById('valNum');
const originEl = document.getElementById('origin');
const resetBtn = document.getElementById('reset');

let currentTabId = null;

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VOLUME' });
    if (res) {
      const pct = Math.round(res.volume * 100);
      volEl.value = pct;
      valNumEl.textContent = pct;
      originEl.textContent = res.origin;
    }
  } catch {
    originEl.textContent = '(このページでは動作しません)';
    volEl.disabled = true;
    resetBtn.disabled = true;
  }
}

function send(pct) {
  valNumEl.textContent = pct;
  chrome.tabs.sendMessage(currentTabId, { type: 'SET_VOLUME', value: pct / 100 });
}

volEl.addEventListener('input', e => send(Number(e.target.value)));
resetBtn.addEventListener('click', () => { volEl.value = 100; send(100); });

init();

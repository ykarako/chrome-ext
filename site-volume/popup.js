const volEl = document.getElementById('vol');
const valNumEl = document.getElementById('valNum');
const originEl = document.getElementById('origin');
const debugEl = document.getElementById('debug');
const resetBtn = document.getElementById('reset');
const enabledEl = document.getElementById('enabled');

let currentTabId = null;

function fmtDebug(res) {
  const lines = [];
  lines.push(`media: ${res.mediaCount} / iframes: ${res.iframeCount} / inject: ${res.injectReady ? 'OK' : 'NO'} / enabled: ${res.enabled ? 'ON' : 'OFF'}`);
  if (res.mediaInfo?.length) {
    const playing = res.mediaInfo.filter(m => !m.paused);
    if (playing.length) {
      lines.push('playing: ' + playing.slice(0, 3).map(m =>
        `${m.tag}(vol=${m.vol.toFixed(2)}${m.muted ? ',mute' : ''})`
      ).join(', '));
    } else {
      const sample = res.mediaInfo[0];
      lines.push(`paused × ${res.mediaInfo.length} (first: vol=${sample.vol.toFixed(2)})`);
    }
  }
  if (res.ctxReport?.states?.length) {
    lines.push('audioCtx: ' + res.ctxReport.states.map(s =>
      `${s.ctxState}/${s.gain == null ? '-' : s.gain.toFixed(2)}`
    ).join(', '));
  } else if (res.ctxReport) {
    lines.push('audioCtx: (none patched)');
  }
  return lines.join('\n');
}

function reflectEnabled(en) {
  enabledEl.checked = en;
  volEl.disabled = !en;
  resetBtn.disabled = !en;
}

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
      reflectEnabled(res.enabled !== false);
      debugEl.textContent = fmtDebug(res);
    }
  } catch {
    originEl.textContent = '(このページでは動作しません)';
    volEl.disabled = true;
    resetBtn.disabled = true;
    enabledEl.disabled = true;
  }
}

function send(pct) {
  valNumEl.textContent = pct;
  chrome.tabs.sendMessage(currentTabId, { type: 'SET_VOLUME', value: pct / 100 });
}

volEl.addEventListener('input', e => send(Number(e.target.value)));
resetBtn.addEventListener('click', () => { volEl.value = 100; send(100); });
enabledEl.addEventListener('change', e => {
  const en = e.target.checked;
  reflectEnabled(en);
  chrome.tabs.sendMessage(currentTabId, { type: 'SET_ENABLED', value: en });
});

init();

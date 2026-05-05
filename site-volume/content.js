(() => {
  const KEY = location.origin;
  let gainValue = 1.0;
  let audioCtx = null;
  const gainNodes = new WeakMap();

  function ensureCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function attach(media) {
    if (gainNodes.has(media)) return;
    try {
      const ctx = ensureCtx();
      const src = ctx.createMediaElementSource(media);
      const gain = ctx.createGain();
      gain.gain.value = gainValue;
      src.connect(gain).connect(ctx.destination);
      gainNodes.set(media, gain);

      media.addEventListener('play', () => {
        if (ctx.state === 'suspended') ctx.resume();
      });
    } catch (e) {
      console.warn('[Site Volume] attach failed:', e);
    }
  }

  function applyGain(v) {
    gainValue = v;
    document.querySelectorAll('video, audio').forEach(m => {
      const g = gainNodes.get(m);
      if (g) g.gain.value = v;
      else attach(m);
    });
  }

  chrome.storage.local.get([KEY], (data) => {
    const cfg = data[KEY];
    if (cfg && typeof cfg.volume === 'number') gainValue = cfg.volume;
    document.querySelectorAll('video, audio').forEach(attach);
  });

  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
          attach(node);
        } else {
          node.querySelectorAll?.('video, audio').forEach(attach);
        }
      }
    }
  });

  const startObserve = () => observer.observe(document.body, { childList: true, subtree: true });
  if (document.body) startObserve();
  else document.addEventListener('DOMContentLoaded', startObserve);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SET_VOLUME') {
      applyGain(msg.value);
      chrome.storage.local.set({ [KEY]: { volume: msg.value } });
      sendResponse({ ok: true });
    } else if (msg.type === 'GET_VOLUME') {
      sendResponse({ volume: gainValue, origin: KEY });
    }
    return true;
  });
})();

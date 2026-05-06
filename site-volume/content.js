(() => {
  const KEY = location.origin;
  const isTop = window === window.top;
  let gainValue = 1.0;
  let enabled = true;
  let lastGainReport = null;
  let injectReady = false;

  function postToPage(type, value) {
    window.postMessage({ __siteVolume: true, type, value }, '*');
  }

  function broadcastToChildren(v, en) {
    for (let i = 0; i < window.frames.length; i++) {
      try {
        window.frames[i].postMessage({ __siteVolumeRelay: true, value: v, enabled: en }, '*');
      } catch (e) {}
    }
  }

  function applyVolumeProperty(v) {
    if (!enabled) return;
    document.querySelectorAll('video, audio').forEach(m => {
      try {
        m.volume = Math.max(0, Math.min(1, v));
        m.muted = v === 0;
      } catch (e) {}
    });
  }

  function applyHere(v, en) {
    gainValue = v;
    enabled = en;
    postToPage('SET_ENABLED', en);
    postToPage('SET_GAIN', v);
    applyVolumeProperty(v);
  }

  function applyAndPropagate(v, en) {
    applyHere(v, en);
    broadcastToChildren(v, en);
  }

  // 同一 window 内の inject.js → content.js / 親フレーム → 子フレームの両方を受信
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d) return;
    if (e.source === window && d.__siteVolume === true) {
      if (d.type === 'INIT') injectReady = true;
      else if (d.type === 'GAIN_REPORT') lastGainReport = d;
      return;
    }
    if (d.__siteVolumeRelay === true) {
      const en = d.enabled !== false;
      applyAndPropagate(Number(d.value) || 0, en);
    }
  });

  // ストレージはトップフレームのみが管理
  if (isTop) {
    chrome.storage.local.get([KEY], (data) => {
      const cfg = data[KEY];
      if (cfg && typeof cfg.volume === 'number') gainValue = cfg.volume;
      if (cfg && typeof cfg.enabled === 'boolean') enabled = cfg.enabled;
      applyAndPropagate(gainValue, enabled);
    });
  }
  // iframe は親からの relay を待つ (デフォルト 1.0 / enabled=true)

  // 新規 media にも m.volume を反映
  const observer = new MutationObserver(muts => {
    if (!enabled) return;
    let touched = false;
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') touched = true;
        else if (node.querySelector?.('video, audio')) touched = true;
      }
    }
    if (touched) applyVolumeProperty(gainValue);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', () => {
    applyVolumeProperty(gainValue);
    broadcastToChildren(gainValue, enabled);
  });
  window.addEventListener('load', () => {
    applyVolumeProperty(gainValue);
    broadcastToChildren(gainValue, enabled);
  });

  function collectMediaInfo() {
    const arr = [];
    document.querySelectorAll('video, audio').forEach(m => {
      arr.push({
        tag: m.tagName.toLowerCase(),
        src: (m.currentSrc || m.src || '').slice(-30),
        paused: m.paused,
        vol: m.volume,
        muted: m.muted
      });
    });
    return arr;
  }

  function persist() {
    if (!isTop) return;
    chrome.storage.local.set({ [KEY]: { volume: gainValue, enabled } });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SET_VOLUME') {
      applyAndPropagate(msg.value, enabled);
      persist();
      sendResponse({ ok: true });
    } else if (msg.type === 'SET_ENABLED') {
      applyAndPropagate(gainValue, !!msg.value);
      persist();
      sendResponse({ ok: true });
    } else if (msg.type === 'GET_VOLUME') {
      lastGainReport = null;
      postToPage('GET_GAIN', null);
      setTimeout(() => {
        sendResponse({
          volume: gainValue,
          enabled,
          origin: KEY,
          isTop,
          mediaCount: document.querySelectorAll('video, audio').length,
          mediaInfo: collectMediaInfo(),
          ctxReport: lastGainReport,
          injectReady,
          iframeCount: document.querySelectorAll('iframe').length
        });
      }, 80);
      return true;
    }
    return true;
  });
})();

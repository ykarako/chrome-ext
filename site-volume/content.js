(() => {
  const KEY = location.origin;
  const isTop = window === window.top;
  let gainValue = 1.0;
  let lastGainReport = null;
  let injectReady = false;

  function postToPage(type, value) {
    window.postMessage({ __siteVolume: true, type, value }, '*');
  }

  function broadcastToChildren(v) {
    for (let i = 0; i < window.frames.length; i++) {
      try {
        window.frames[i].postMessage({ __siteVolumeRelay: true, value: v }, '*');
      } catch (e) {}
    }
  }

  function applyVolumeProperty(v) {
    document.querySelectorAll('video, audio').forEach(m => {
      try {
        m.volume = Math.max(0, Math.min(1, v));
        m.muted = v === 0;
      } catch (e) {}
    });
  }

  function applyHere(v) {
    gainValue = v;
    postToPage('SET_GAIN', v);
    applyVolumeProperty(v);
  }

  function applyAndPropagate(v) {
    applyHere(v);
    broadcastToChildren(v);
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
      applyAndPropagate(Number(d.value) || 0);
    }
  });

  // ストレージはトップフレームのみが管理
  if (isTop) {
    chrome.storage.local.get([KEY], (data) => {
      const cfg = data[KEY];
      if (cfg && typeof cfg.volume === 'number') gainValue = cfg.volume;
      applyAndPropagate(gainValue);
    });
  }
  // iframe は親からの relay を待つ (デフォルト 1.0)

  // 新規 media にも m.volume を反映
  const observer = new MutationObserver(muts => {
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
    broadcastToChildren(gainValue);
  });
  window.addEventListener('load', () => {
    applyVolumeProperty(gainValue);
    broadcastToChildren(gainValue);
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

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SET_VOLUME') {
      applyAndPropagate(msg.value);
      if (isTop) chrome.storage.local.set({ [KEY]: { volume: msg.value } });
      sendResponse({ ok: true });
    } else if (msg.type === 'GET_VOLUME') {
      lastGainReport = null;
      postToPage('GET_GAIN', null);
      setTimeout(() => {
        sendResponse({
          volume: gainValue,
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

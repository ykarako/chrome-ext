(() => {
  const Orig = window.AudioContext || window.webkitAudioContext;
  if (!Orig) return;

  const origConnect = AudioNode.prototype.connect;
  const origDisconnect = AudioNode.prototype.disconnect;
  const origPlay = HTMLMediaElement.prototype.play;
  const origVolumeDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');

  const ctxGains = new WeakMap();
  const knownGains = new WeakSet();
  const allCtx = new Set();
  let currentGain = 1.0;
  let enabled = true;

  // 詳細ログ: localStorage.siteVolumeDebug = '1' でページごとに有効化 (調査用)
  let DEBUG = false;
  try { if (localStorage.getItem('siteVolumeDebug') === '1') DEBUG = true; } catch (e) {}
  const t0 = performance.now();
  const dlog = (...a) => {
    if (!DEBUG) return;
    console.log('[SV+' + (performance.now() - t0).toFixed(0) + 'ms]', ...a);
  };

  function ensureCtxGain(ctx) {
    let g = ctxGains.get(ctx);
    if (g) return g;
    g = ctx.createGain();
    g.gain.value = enabled ? currentGain : 1.0;
    knownGains.add(g);
    origConnect.call(g, ctx.destination);
    ctxGains.set(ctx, g);
    allCtx.add(ctx);
    return g;
  }

  AudioNode.prototype.connect = function (target, ...rest) {
    if (enabled && target instanceof AudioDestinationNode && !knownGains.has(this)) {
      const g = ensureCtxGain(this.context);
      return origConnect.call(this, g, ...rest);
    }
    return origConnect.call(this, target, ...rest);
  };

  AudioNode.prototype.disconnect = function (...args) {
    if (args.length === 0) {
      try { return origDisconnect.call(this); } catch (e) {}
      return;
    }
    if (enabled && args[0] instanceof AudioDestinationNode && !knownGains.has(this)) {
      const g = ctxGains.get(this.context);
      if (g) {
        try { return origDisconnect.call(this, g); } catch (e) {}
        return;
      }
    }
    return origDisconnect.apply(this, args);
  };

  // .play() のたびに m.volume を上書き (DOM 非接続な new Audio() でも有効)
  HTMLMediaElement.prototype.play = function () {
    if (enabled) {
      try {
        origVolumeDesc.set.call(this, Math.max(0, Math.min(1, currentGain)));
        this.muted = currentGain === 0;
      } catch (e) {}
    }
    return origPlay.apply(this, arguments);
  };

  // volume setter フック: サイト側 (YouTube Shorts 等) が再生中に volume を書き戻しても
  // currentGain を超えないようキャップする
  Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    configurable: true,
    enumerable: true,
    get() { return origVolumeDesc.get.call(this); },
    set(v) {
      if (DEBUG) {
        const before = origVolumeDesc.get.call(this);
        dlog('video.volume set:', Number(v).toFixed(3), '(was', Number(before).toFixed(3) + ')',
          'src=…' + ((this.currentSrc || this.src || '').slice(-24)));
      }
      if (!enabled) return origVolumeDesc.set.call(this, v);
      const cap = Math.max(0, Math.min(1, currentGain));
      const clamped = Math.max(0, Math.min(cap, Number(v)));
      return origVolumeDesc.set.call(this, clamped);
    }
  });

  function applyToAll(v) {
    currentGain = v;
    for (const ctx of allCtx) {
      const g = ctxGains.get(ctx);
      if (!g) continue;
      g.gain.value = enabled ? v : 1.0;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    }
  }

  function applyEnabled(e) {
    enabled = !!e;
    for (const ctx of allCtx) {
      const g = ctxGains.get(ctx);
      if (!g) continue;
      g.gain.value = enabled ? currentGain : 1.0;
    }
  }

  // volumechange フォールバック: setter フックを迂回して volume が書き換えられた場合に
  // 即座にキャップへ押し戻す (YouTube Shorts の脈動対策)
  window.addEventListener('volumechange', (e) => {
    const m = e.target;
    if (!(m instanceof HTMLMediaElement)) return;
    if (DEBUG) dlog('volumechange evt:', m.volume.toFixed(3), 'muted=' + m.muted,
      'src=…' + ((m.currentSrc || m.src || '').slice(-24)));
    if (!enabled) return;
    const cap = Math.max(0, Math.min(1, currentGain));
    if (m.volume > cap + 0.0005) {
      origVolumeDesc.set.call(m, cap);
      if (cap === 0 && !m.muted) m.muted = true;
      if (DEBUG) dlog('  ↳ snapped back to', cap.toFixed(3));
    }
  }, true);

  window.postMessage({ __siteVolume: true, type: 'INIT' }, '*');

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.__siteVolume !== true) return;
    if (d.type === 'SET_GAIN') {
      applyToAll(Number(d.value) || 0);
    } else if (d.type === 'SET_ENABLED') {
      applyEnabled(d.value);
    } else if (d.type === 'GET_GAIN') {
      const states = [];
      for (const ctx of allCtx) {
        const g = ctxGains.get(ctx);
        states.push({ ctxState: ctx.state, gain: g ? g.gain.value : null });
      }
      window.postMessage({ __siteVolume: true, type: 'GAIN_REPORT', currentGain, enabled, states }, '*');
    }
  });
})();

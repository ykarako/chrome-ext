(() => {
  const Orig = window.AudioContext || window.webkitAudioContext;
  if (!Orig) return;

  const origConnect = AudioNode.prototype.connect;
  const origDisconnect = AudioNode.prototype.disconnect;
  const origPlay = HTMLMediaElement.prototype.play;

  const ctxGains = new WeakMap();
  const knownGains = new WeakSet();
  const allCtx = new Set();
  let currentGain = 1.0;

  function ensureCtxGain(ctx) {
    let g = ctxGains.get(ctx);
    if (g) return g;
    g = ctx.createGain();
    g.gain.value = currentGain;
    knownGains.add(g);
    origConnect.call(g, ctx.destination);
    ctxGains.set(ctx, g);
    allCtx.add(ctx);
    return g;
  }

  AudioNode.prototype.connect = function (target, ...rest) {
    if (target instanceof AudioDestinationNode && !knownGains.has(this)) {
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
    if (args[0] instanceof AudioDestinationNode && !knownGains.has(this)) {
      const g = ctxGains.get(this.context);
      if (g) {
        try { return origDisconnect.call(this, g); } catch (e) {}
        return;
      }
    }
    return origDisconnect.apply(this, args);
  };

  // .play() のたびに m.volume を上書き (DOM 非接続な new Audio() でも有効)
  // Web Audio への自動 attach はしない (CORS-tainted で無音化するリスクあり)
  HTMLMediaElement.prototype.play = function () {
    try {
      this.volume = Math.max(0, Math.min(1, currentGain));
      this.muted = currentGain === 0;
    } catch (e) {}
    return origPlay.apply(this, arguments);
  };

  function applyToAll(v) {
    currentGain = v;
    for (const ctx of allCtx) {
      const g = ctxGains.get(ctx);
      if (!g) continue;
      g.gain.value = v;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    }
  }

  window.postMessage({ __siteVolume: true, type: 'INIT' }, '*');

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.__siteVolume !== true) return;
    if (d.type === 'SET_GAIN') {
      applyToAll(Number(d.value) || 0);
    } else if (d.type === 'GET_GAIN') {
      const states = [];
      for (const ctx of allCtx) {
        const g = ctxGains.get(ctx);
        states.push({ ctxState: ctx.state, gain: g ? g.gain.value : null });
      }
      window.postMessage({ __siteVolume: true, type: 'GAIN_REPORT', currentGain, states }, '*');
    }
  });
})();

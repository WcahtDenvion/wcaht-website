/* ──────────────────────────────────────────────────────────────────────────
   WCAHT activation funnel — shared by the landing page and the wallet.

   Two jobs:
     1. wcahtTrack()  — pseudonymous funnel events, so we can see WHERE
                        visitors stop instead of guessing. No addresses, no
                        keys, no personal data ever leaves the page.
     2. The guided panel — the three-step "create a wallet → claim test
                        tokens → send a test transaction" run that turns a
                        visitor into someone who has actually used the chain.

   Loaded on both pages; the guided panel only renders where a mount point
   exists and the visitor arrived with ?start=.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var SESSION_KEY = 'wcaht_activation_session';
  var ATTRIB_KEY = 'wcaht_activation_attribution';
  var STEP_KEY = 'wcaht_activation_steps';
  var DISMISS_KEY = 'wcaht_activation_dismissed';

  // Whether the finished checklist is expanded. Defaults to collapsed and is
  // per-page-load only: reopening it is a momentary "what did I do again?"
  // check, not a preference worth persisting.
  var stepsExpanded = false;

  // ── Pseudonymous session id ───────────────────────────────────────────────
  // Random, per-browser, and meaningless outside this funnel. It exists only
  // so a single visitor's steps can be joined together into a funnel.
  function sessionId() {
    try {
      var id = localStorage.getItem(SESSION_KEY);
      if (!id) {
        id = 's_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
        localStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (e) {
      return 's_ephemeral';
    }
  }

  // ── Campaign attribution ──────────────────────────────────────────────────
  // Captured once on the first page that carries UTM tags, then reused, so a
  // conversion three pages later still credits the source that produced it.
  function attribution() {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(ATTRIB_KEY) || 'null'); } catch (e) {}
    var params = new URLSearchParams(window.location.search);
    var fresh = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      var v = params.get(k);
      if (v) fresh[k] = v.slice(0, 64);
    });
    if (Object.keys(fresh).length) {
      if (!fresh.referrer && document.referrer) {
        try { fresh.referrer = new URL(document.referrer).hostname.slice(0, 64); } catch (e) {}
      }
      try { localStorage.setItem(ATTRIB_KEY, JSON.stringify(fresh)); } catch (e) {}
      return fresh;
    }
    if (stored) return stored;
    var initial = {};
    if (document.referrer) {
      try {
        var host = new URL(document.referrer).hostname;
        if (host && host !== window.location.hostname) initial.referrer = host.slice(0, 64);
      } catch (e) {}
    }
    try { localStorage.setItem(ATTRIB_KEY, JSON.stringify(initial)); } catch (e) {}
    return initial;
  }

  var ADDRESS_LIKE = /(0x[a-fA-F0-9]{6,})|([1-9A-HJ-NP-Za-km-z]{32,})/;

  // Defence in depth: a caller should never pass an address or key, but the
  // funnel must not become an exfiltration path if someone later does.
  function scrubProps(props) {
    var out = {};
    if (!props) return out;
    Object.keys(props).slice(0, 12).forEach(function (k) {
      var v = props[k];
      if (typeof v === 'number' || typeof v === 'boolean') { out[k] = v; return; }
      if (typeof v !== 'string') return;
      if (v.length > 64 || ADDRESS_LIKE.test(v)) { out[k] = '[redacted]'; return; }
      out[k] = v;
    });
    return out;
  }

  window.wcahtTrack = function (event, props) {
    if (!event) return;
    var body = {
      event: String(event).slice(0, 48),
      session: sessionId(),
      path: window.location.pathname.slice(0, 96),
      attribution: attribution(),
      props: scrubProps(props),
      ts: Date.now(),
    };
    try {
      var payload = JSON.stringify(body);
      // sendBeacon survives the page unload that a CTA click usually causes.
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/activation/event', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/activation/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) { /* analytics must never break the page */ }
  };

  // ── Step state ────────────────────────────────────────────────────────────
  function loadSteps() {
    try { return JSON.parse(localStorage.getItem(STEP_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveSteps(s) {
    try { localStorage.setItem(STEP_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // ── Finished-run state ────────────────────────────────────────────────────
  // A checklist with every item struck through has served its purpose and is
  // just clutter above the wallet. Once all three steps are done the panel
  // collapses to a single confirmation line, and the visitor can hide it for
  // good. Dismissal is remembered so it does not reappear on every visit.
  function allStepsDone(steps) {
    return STEPS.every(function (s) { return !!steps[s.key]; });
  }
  function isDismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }
  function setDismissed() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }

  window.activationStepDone = function (step, meta) {
    var steps = loadSteps();
    if (steps[step]) { renderPanel(); return; }
    steps[step] = Date.now();
    saveSteps(steps);
    renderPanel();
    if (step === 'send') {
      var banner = document.getElementById('activationComplete');
      if (banner) banner.style.display = 'block';
      if (meta && meta.txHash) {
        var link = document.getElementById('activationTxLink');
        if (link) {
          link.href = '/dashboard?tx=' + encodeURIComponent(meta.txHash);
          link.style.display = 'inline';
        }
      }
    }
  };

  // ── The guided panel ──────────────────────────────────────────────────────
  var STEPS = [
    {
      key: 'wallet',
      title: 'Set up a test wallet',
      body: 'Create a wallet in your browser, or connect MetaMask. We will never ask for your Secret Recovery Phrase or private key.',
      actions: [
        { label: 'Create a test wallet', fn: 'showCreateModal', primary: true },
        { label: 'Connect MetaMask', fn: 'connectWcahtEvmWallet' },
      ],
    },
    {
      key: 'claim',
      title: 'Claim free test tokens',
      body: 'Test WCAHT for trying the network. It has no monetary value and cannot be exchanged for anything.',
      actions: [{ label: 'Claim test WCAHT', fn: 'openFaucetTry', primary: true }],
    },
    {
      key: 'send',
      title: 'Send your first test transaction',
      body: 'Send a small amount and watch it confirm on the public testnet. That is the whole chain, working, in front of you.',
      actions: [{ label: 'Go to Send', fn: 'startFirstSend', primary: true }],
    },
  ];

  var DEFAULT_TITLE = 'Get WCAHT coin in three steps';
  var DEFAULT_LEAD = 'Set up a wallet, claim free WCAHT coin, then send a transaction and watch it confirm. Nothing here costs money.';
  var DONE_TITLE = 'You have completed all three steps';
  var DONE_LEAD = 'Your wallet is set up, funded, and has sent a transaction on the public network.';

  // Collapse the panel down to its header once the run is finished, and wire
  // the show/hide controls. Safe to call on every render — it only touches the
  // DOM when the state actually differs, so the 1.5s re-render loop cannot
  // fight the visitor's choice to expand the list.
  function applyFinishedState(mount, finished) {
    var list = mount.querySelector('.act-steps');
    var actions = mount.querySelector('#actHeadActions');
    var title = mount.querySelector('#actTitle');
    var lead = mount.querySelector('#actLead');
    var toggle = mount.querySelector('#actToggleSteps');

    if (mount.classList.contains('act-finished') !== finished) {
      mount.classList.toggle('act-finished', finished);
    }
    if (actions && actions.hidden === finished) actions.hidden = !finished;

    if (!finished) {
      if (list && list.hidden) list.hidden = false;
      if (title && title.textContent !== DEFAULT_TITLE) title.textContent = DEFAULT_TITLE;
      if (lead && lead.textContent !== DEFAULT_LEAD) lead.textContent = DEFAULT_LEAD;
      return;
    }

    if (title && title.textContent !== DONE_TITLE) title.textContent = DONE_TITLE;
    if (lead && lead.textContent !== DONE_LEAD) lead.textContent = DONE_LEAD;
    if (list && list.hidden === stepsExpanded) list.hidden = !stepsExpanded;
    if (toggle) {
      var label = stepsExpanded ? 'Hide steps' : 'Show steps';
      if (toggle.textContent !== label) toggle.textContent = label;
      toggle.setAttribute('aria-expanded', stepsExpanded ? 'true' : 'false');
    }
  }

  function wireFinishedControls(mount) {
    var toggle = mount.querySelector('#actToggleSteps');
    var dismiss = mount.querySelector('#actDismiss');
    if (toggle && !toggle.dataset.wired) {
      toggle.dataset.wired = '1';
      toggle.addEventListener('click', function () {
        stepsExpanded = !stepsExpanded;
        applyFinishedState(mount, true);
        window.wcahtTrack('activation_steps_toggled', { expanded: stepsExpanded });
      });
    }
    if (dismiss && !dismiss.dataset.wired) {
      dismiss.dataset.wired = '1';
      dismiss.addEventListener('click', function () {
        setDismissed();
        mount.style.display = 'none';
        window.wcahtTrack('activation_panel_dismissed', {});
      });
    }
  }

  function walletIsReady() {
    try {
      if (typeof activeWallet !== 'undefined' && activeWallet) return true;
    } catch (e) {}
    var evm = document.getElementById('evmAddress');
    return !!(evm && evm.textContent && evm.textContent.indexOf('0x') === 0);
  }

  function renderPanel() {
    var mount = document.getElementById('activationPanel');
    if (!mount) return;
    var steps = loadSteps();
    if (walletIsReady() && !steps.wallet) {
      steps.wallet = Date.now();
      saveSteps(steps);
      window.wcahtTrack('wallet_ready', {});
    }
    var activeIndex = STEPS.findIndex(function (s) { return !steps[s.key]; });
    if (activeIndex === -1) activeIndex = STEPS.length;

    var html = STEPS.map(function (s, i) {
      var done = !!steps[s.key];
      var isActive = i === activeIndex;
      var state = done ? 'done' : (isActive ? 'active' : 'locked');
      var actions = (done || !isActive) ? '' :
        '<div class="act-actions">' + s.actions.map(function (a) {
          return '<button type="button" class="act-btn' + (a.primary ? ' act-btn-primary' : '') +
                 '" data-act-fn="' + a.fn + '">' + a.label + '</button>';
        }).join('') + '</div>';
      return (
        '<li class="act-step act-' + state + '">' +
          '<span class="act-marker">' + (done ? '✓' : String(i + 1)) + '</span>' +
          '<div class="act-body">' +
            '<h4>' + s.title + '</h4>' +
            '<p>' + s.body + '</p>' +
            actions +
          '</div>' +
        '</li>'
      );
    }).join('');

    mount.querySelector('.act-steps').innerHTML = html;
    applyFinishedState(mount, allStepsDone(steps));
    mount.querySelectorAll('[data-act-fn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.dataset.actFn;
        window.wcahtTrack('activation_action', { action: name });
        if (name === 'openFaucetTry') {
          if (typeof showAirdropModal === 'function') showAirdropModal('try');
          return;
        }
        if (name === 'startFirstSend') { startFirstSend(); return; }
        if (name === 'showCreateModal') window.wcahtTrack('wallet_setup_started', { method: 'new' });
        if (name === 'connectWcahtEvmWallet') window.wcahtTrack('wallet_setup_started', { method: 'metamask' });
        if (typeof window[name] === 'function') window[name]();
      });
    });
  }

  // Step 3 needs somewhere to send. A second local test wallet is the safest
  // destination we can offer: no third-party address, no real value, and the
  // visitor can see both sides of the transfer.
  function startFirstSend() {
    if (typeof switchTab === 'function') {
      var sendBtn = document.querySelector('.wtab-bar button, .tab-bar button');
      try { switchTab('send', sendBtn); } catch (e) {}
    }
    var amount = document.getElementById('sendAmount');
    if (amount && !amount.value) amount.value = '1';
    var target = document.getElementById('tab-send');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var to = document.getElementById('sendTo');
    if (to) setTimeout(function () { to.focus(); }, 400);
    var hint = document.getElementById('activationSendHint');
    if (hint) hint.style.display = 'block';
  }
  window.startFirstSend = startFirstSend;

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    var mount = document.getElementById('activationPanel');
    var params = new URLSearchParams(window.location.search);
    if (mount) {
      var steps = loadSteps();
      var started = params.get('start');
      var resuming = steps.wallet || steps.claim;
      // Someone who finished the run and hid the panel should not have it
      // pushed back at them on every visit. An explicit ?start= still wins, so
      // the link in a campaign or the docs always opens the guide.
      if (!started && allStepsDone(steps) && isDismissed()) resuming = false;
      // Show the guided run to anyone who asked for it, and to anyone who is
      // part-way through it, so a refresh does not lose the thread.
      if (started || resuming) {
        mount.style.display = 'block';
        wireFinishedControls(mount);
        renderPanel();
        if (started) window.wcahtTrack('guided_start_opened', { start: started.slice(0, 24) });
        // activeWallet is populated asynchronously after load.
        setInterval(renderPanel, 1500);
      }
    }
    window.wcahtTrack('page_view', {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/*
 * Knox Portal Obfuscator — content script.
 *
 * Two modes (toggled by the toolbar icon):
 *   PRIVATE  -> sensitive values shown masked (for screen sharing)
 *   SHOW     -> real values shown
 *
 * Copy works in BOTH modes: hovering a value pops a single floating "copy" pill
 * (anchored to the page body, so it's never clipped by table cells). Clicking the
 * value itself is left alone so links still navigate.
 *
 * Strategy: wrap every sensitive match in a <span.knox-obf-token> that holds both
 * the real and masked text, so toggling modes just re-renders text.
 */
(() => {
  const { RULE_DEFS, mergeState } = window.KNOX_OBF;
  const TOKEN_CLASS = "knox-obf-token";

  let state = { enabled: true, rules: {} };
  let observer = null;
  let currentToken = null;
  let hideTimer = null;

  const activeRules = () =>
    RULE_DEFS.filter((r) => state.rules[r.id]).map((r) => ({ ...r, regex: r.re() }));

  // ---- styles ----
  const style = document.createElement("style");
  style.textContent = `
    .${TOKEN_CLASS} { cursor: default; }
    .${TOKEN_CLASS}:hover { text-decoration: underline dotted; text-underline-offset: 2px; }
    .${TOKEN_CLASS}.knox-flash { background: #c6f6d5; transition: background .1s; }
    #knox-float-copy {
      position: fixed;
      z-index: 2147483647;
      display: none;
      cursor: copy;
      font: 600 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      letter-spacing: .5px;
      text-transform: uppercase;
      padding: 5px 10px;
      border-radius: 999px;
      background: #2b6cb0;
      color: #fff;
      box-shadow: 0 1px 5px rgba(0,0,0,.35);
      user-select: none;
      white-space: nowrap;
    }
    #knox-float-copy:hover { background: #2c5282; }
    #knox-float-copy.knox-done { background: #2f855a; }
  `;
  (document.head || document.documentElement).appendChild(style);

  // ---- single floating copy pill ----
  const floatBtn = document.createElement("div");
  floatBtn.id = "knox-float-copy";
  floatBtn.textContent = "copy";
  floatBtn.setAttribute("role", "button");
  (document.body || document.documentElement).appendChild(floatBtn);

  function showFloat(tok) {
    clearTimeout(hideTimer);
    currentToken = tok;
    floatBtn.textContent = "copy";
    floatBtn.classList.remove("knox-done");
    floatBtn.style.display = "block";
    const r = tok.getBoundingClientRect();
    const top = r.top + r.height / 2 - floatBtn.offsetHeight / 2;
    let left = r.right + 6;
    if (left + floatBtn.offsetWidth > window.innerWidth - 4) {
      left = r.left - floatBtn.offsetWidth - 6; // flip to the left if off-screen
    }
    floatBtn.style.top = Math.max(2, top) + "px";
    floatBtn.style.left = Math.max(2, left) + "px";
  }

  function hideFloat() {
    floatBtn.style.display = "none";
    currentToken = null;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideFloat, 160);
  }

  async function copyValue(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  document.addEventListener("mouseover", (e) => {
    const tok = e.target.closest && e.target.closest("." + TOKEN_CLASS);
    if (tok) {
      showFloat(tok);
    } else if (e.target === floatBtn) {
      clearTimeout(hideTimer);
    }
  });

  document.addEventListener("mouseout", (e) => {
    const to = e.relatedTarget;
    const stillToken = to && to.closest && to.closest("." + TOKEN_CLASS);
    if (!stillToken && to !== floatBtn) scheduleHide();
  });

  floatBtn.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  floatBtn.addEventListener("mouseleave", scheduleHide);
  floatBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentToken) return;
    const tok = currentToken;
    await copyValue(tok.dataset.real);
    floatBtn.textContent = "copied!";
    floatBtn.classList.add("knox-done");
    tok.classList.add("knox-flash");
    setTimeout(() => tok.classList.remove("knox-flash"), 400);
  });

  // Hide on scroll so the pill never floats in a stale position.
  window.addEventListener("scroll", hideFloat, true);

  // ---- scanning ----
  function shouldSkip(node) {
    const p = node.parentNode;
    if (!p) return true;
    const tag = p.nodeName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "NOSCRIPT") return true;
    if (p.closest && p.closest("." + TOKEN_CLASS)) return true; // already wrapped
    if (p.isContentEditable) return true;
    return false;
  }

  function findHits(text) {
    const hits = [];
    for (const rule of activeRules()) {
      rule.regex.lastIndex = 0;
      let m;
      while ((m = rule.regex.exec(text)) !== null) {
        hits.push({ start: m.index, end: m.index + m[0].length, value: m[0], rule });
        if (m.index === rule.regex.lastIndex) rule.regex.lastIndex++;
      }
    }
    hits.sort((a, b) => a.start - b.start || b.end - a.end);
    const out = [];
    let lastEnd = -1;
    for (const h of hits) {
      if (h.start >= lastEnd) {
        out.push(h);
        lastEnd = h.end;
      }
    }
    return out;
  }

  function makeToken(hit) {
    const span = document.createElement("span");
    span.className = TOKEN_CLASS;
    span.dataset.real = hit.value;
    span.dataset.masked = hit.rule.mask(hit.value);
    span.dataset.rule = hit.rule.id;
    renderToken(span);
    return span;
  }

  function renderToken(span) {
    span.textContent = state.enabled ? span.dataset.masked : span.dataset.real;
  }

  function processTextNode(node) {
    if (shouldSkip(node)) return;
    const text = node.nodeValue;
    if (!text || !text.trim()) return;
    const hits = findHits(text);
    if (!hits.length) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const hit of hits) {
      if (hit.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, hit.start)));
      frag.appendChild(makeToken(hit));
      cursor = hit.end;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode.replaceChild(frag, node);
  }

  function walk(root) {
    if (!activeRules().length) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(processTextNode);
  }

  function rerenderAll() {
    document.querySelectorAll("." + TOKEN_CLASS).forEach(renderToken);
  }

  // ---- observe dynamic content (tables load async) ----
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((muts) => {
      for (const mut of muts) {
        mut.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) processTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE && node.id !== "knox-float-copy") walk(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function apply() {
    walk(document.body);
    rerenderAll();
    startObserver();
  }

  // ---- load state + listen for changes ----
  chrome.storage.sync.get(null, (stored) => {
    state = mergeState(stored);
    apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    chrome.storage.sync.get(null, (stored) => {
      const next = mergeState(stored);
      const rulesChanged = JSON.stringify(next.rules) !== JSON.stringify(state.rules);
      state = next;
      if (rulesChanged) {
        document.querySelectorAll("." + TOKEN_CLASS).forEach((span) => {
          span.replaceWith(document.createTextNode(span.dataset.real));
        });
        apply();
      } else {
        rerenderAll();
      }
    });
  });
})();

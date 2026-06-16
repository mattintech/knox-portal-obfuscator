/* Options page: master mode toggle + per-rule on/off, persisted to storage.sync. */
const { RULE_DEFS, mergeState } = window.KNOX_OBF;

const $ = (id) => document.getElementById(id);
let state;

function flash(msg) {
  $("saved").textContent = msg;
  setTimeout(() => ($("saved").textContent = ""), 1200);
}

function renderMode() {
  const on = state.enabled;
  $("modeName").innerHTML = on
    ? '<span class="pill on">PRIVATE</span>'
    : '<span class="pill off">SHOW</span>';
  $("modeHint").textContent = on
    ? "Sensitive values are masked — safe to screen share."
    : "Real values visible. (Copying works in either mode — hover a value for the COPY pill.)";
  $("toggle").textContent = on ? "Switch to Show (reveal values)" : "Switch to Private (mask values)";
}

function renderRules() {
  const ul = $("rules");
  ul.innerHTML = "";
  for (const rule of RULE_DEFS) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    label.textContent = rule.label;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!state.rules[rule.id];
    cb.addEventListener("change", () => {
      state.rules[rule.id] = cb.checked;
      chrome.storage.sync.set({ rules: state.rules }, () => flash("Saved"));
    });
    li.appendChild(label);
    li.appendChild(cb);
    ul.appendChild(li);
  }
}

$("toggle").addEventListener("click", () => {
  state.enabled = !state.enabled;
  chrome.storage.sync.set({ enabled: state.enabled }, () => {
    renderMode();
    flash("Saved");
  });
});

chrome.storage.sync.get(null, (stored) => {
  state = mergeState(stored);
  renderMode();
  renderRules();
});

chrome.storage.onChanged.addListener((c, area) => {
  if (area !== "sync") return;
  chrome.storage.sync.get(null, (stored) => {
    state = mergeState(stored);
    renderMode();
  });
});

/*
 * Background service worker.
 * Toolbar icon click flips between PRIVATE (masked) and SHOW (real values visible).
 * Copy works in BOTH modes (hover a value -> COPY pill), so the mode is purely
 * about whether values are masked on screen. Badge reflects mode at a glance.
 */

const DEFAULT_ENABLED = true;

function setBadge(enabled) {
  // PRIVATE = green (closed lock, masked/safe). SHOW = red (open lock, real values).
  const icon = (suffix) => ({
    16: `icons/icon16${suffix}.png`,
    48: `icons/icon48${suffix}.png`,
    128: `icons/icon128${suffix}.png`,
  });
  chrome.action.setIcon({ path: icon(enabled ? "" : "-show") });
  chrome.action.setTitle({
    title: enabled
      ? "Knox Obfuscator: PRIVATE (values masked — safe to screen share). Click to show real values."
      : "Knox Obfuscator: SHOW (real values visible). Click to mask for screen sharing.",
  });
}

function refreshBadge() {
  chrome.storage.sync.get({ enabled: DEFAULT_ENABLED }, ({ enabled }) => setBadge(enabled));
}

chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);

chrome.action.onClicked.addListener(() => {
  chrome.storage.sync.get({ enabled: DEFAULT_ENABLED }, ({ enabled }) => {
    const next = !enabled;
    chrome.storage.sync.set({ enabled: next }, () => setBadge(next));
  });
});

// Keep badge in sync if changed elsewhere (e.g. options page).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) setBadge(changes.enabled.newValue);
});

/*
 * Shared config: default rules + masking helpers.
 * Loaded by content script, options page, and background.
 *
 * Masking style (user spec): keep the first and last segment, mask the middle.
 *   KLM12-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE  ->  KLM12-*****-*****-*****-*****-EEEEE
 */

// Mask a hyphen-segmented key: keep first + last segment, star the rest.
function maskSegmented(value) {
  const parts = value.split("-");
  if (parts.length <= 2) return value; // nothing meaningful to hide
  return parts
    .map((p, i) => (i === 0 || i === parts.length - 1 ? p : "*".repeat(p.length)))
    .join("-");
}

// Keep `head` leading and `tail` trailing chars, star the middle.
function maskEnds(value, head, tail) {
  if (value.length <= head + tail) return value;
  return value.slice(0, head) + "*".repeat(value.length - head - tail) + value.slice(value.length - tail);
}

function maskEmail(value) {
  const at = value.indexOf("@");
  if (at < 1) return value;
  const local = value.slice(0, at);
  const domain = value.slice(at);
  const keep = local[0];
  return keep + "*".repeat(Math.max(local.length - 1, 1)) + domain;
}

// Each rule: id, label, default on/off, regex (global), and a mask function.
// Order matters: more specific patterns first so they win.
const RULE_DEFS = [
  {
    id: "klm",
    label: "License keys (KLM…)",
    on: true,
    re: () => /\bKLM\d*-[A-Z0-9]{4,6}(?:-[A-Z0-9]{4,6})+\b/g,
    mask: maskSegmented,
  },
  {
    id: "mac",
    label: "Wi-Fi MAC addresses",
    on: true,
    re: () => /\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}\b/g,
    mask: (v) => {
      const o = v.split(":");
      return o.map((x, i) => (i < 2 || i === o.length - 1 ? x : "**")).join(":");
    },
  },
  {
    id: "imei",
    label: "IMEI / MEID (15-digit)",
    on: true,
    re: () => /\b\d{15}\b/g,
    mask: (v) => maskEnds(v, 4, 2),
  },
  {
    id: "serial",
    label: "Samsung serial numbers",
    on: true,
    re: () => /\bR[A-Z0-9][A-Z0-9]{8,12}\b/g,
    mask: (v) => maskEnds(v, 3, 2),
  },
  {
    id: "email",
    label: "Email addresses",
    on: true,
    re: () => /[\w.+-]+@[\w.-]+\.\w{2,}/g,
    mask: maskEmail,
  },
  {
    id: "order",
    label: "Order numbers (SO…)",
    on: false,
    re: () => /\bSO[-_ ]?\d{6,}\b/gi,
    mask: (v) => maskEnds(v, 2, 2),
  },
  {
    id: "phone",
    label: "Phone numbers (10-digit)",
    on: false,
    // Avoid colliding with 15-digit IMEIs: exactly 10 digits, optional separators.
    re: () => /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    mask: (v) => maskEnds(v, 3, 2),
  },
];

const DEFAULT_STATE = {
  enabled: true, // master pause/resume
  rules: Object.fromEntries(RULE_DEFS.map((r) => [r.id, r.on])),
};

// Merge stored prefs over defaults (so new rules added later default correctly).
function mergeState(stored) {
  const s = stored || {};
  return {
    enabled: s.enabled !== undefined ? s.enabled : DEFAULT_STATE.enabled,
    rules: { ...DEFAULT_STATE.rules, ...(s.rules || {}) },
  };
}

// Expose for non-module content-script context.
if (typeof window !== "undefined") {
  window.KNOX_OBF = { RULE_DEFS, DEFAULT_STATE, mergeState };
}

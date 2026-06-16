#!/usr/bin/env bash
# Build store-ready extension packages for Chrome (also Edge) and Firefox.
# Usage: ./build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$ROOT/src"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST/chrome" "$DIST/firefox"

build() {
  local browser="$1" manifest="$2"
  local out="$DIST/$browser"
  cp -R "$SRC/." "$out/"
  cp "$ROOT/manifests/$manifest" "$out/manifest.json"
  ( cd "$out" && zip -qr "$DIST/knox-obfuscator-$browser.zip" . )
  echo "  ✓ $browser  ->  dist/$browser/  (and dist/knox-obfuscator-$browser.zip)"
}

echo "Building Knox Portal Obfuscator…"
build chrome  chrome.json
build firefox firefox.json
echo "Done."
echo
echo "Load unpacked:"
echo "  Chrome / Edge : dist/chrome"
echo "  Firefox       : dist/firefox  (about:debugging > This Firefox > Load Temporary Add-on > manifest.json)"

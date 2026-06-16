#!/usr/bin/env python3
"""Evaluate JS in the active Knox tab via Chrome DevTools Protocol.

Usage:
    .venv/bin/python tools/cdp_eval.py "document.title"
    .venv/bin/python tools/cdp_eval.py --file tools/snippet.js

Connects to Chrome started with --remote-debugging-port=9222 and runs the
given expression in the first samsungknox.com page tab, printing the result.
"""
import json
import sys
import urllib.request
import websocket  # type: ignore

PORT = 9222


def pick_tab():
    tabs = json.load(urllib.request.urlopen(f"http://localhost:{PORT}/json"))
    pages = [t for t in tabs if t.get("type") == "page" and t.get("webSocketDebuggerUrl")]
    knox = [t for t in pages if "samsungknox.com" in t.get("url", "")]
    chosen = (knox or pages)
    if not chosen:
        sys.exit("No debuggable page tab found.")
    return chosen[0]


def evaluate(expr):
    tab = pick_tab()
    ws = websocket.create_connection(tab["webSocketDebuggerUrl"], max_size=None)
    try:
        ws.send(json.dumps({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {"expression": expr, "returnByValue": True, "awaitPromise": True},
        }))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == 1:
                result = msg.get("result", {})
                if "exceptionDetails" in result:
                    print("JS ERROR:", json.dumps(result["exceptionDetails"], indent=2))
                    return
                val = result.get("result", {}).get("value")
                print(val if isinstance(val, str) else json.dumps(val, indent=2))
                return
    finally:
        ws.close()


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--file":
        expr = open(sys.argv[2]).read()
    elif len(sys.argv) >= 2:
        expr = sys.argv[1]
    else:
        sys.exit(__doc__)
    evaluate(expr)

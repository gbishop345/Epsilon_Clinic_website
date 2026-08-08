#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$ROOT"
PORT=8086
URL="http://localhost:${PORT}/?nocache=$(date +%s)"
# CSS phone layout is max-width: 480px; size Safari for a phone-like viewport.
PHONE_W=390
PHONE_H=844

cd "$DIR"

if pids=$(lsof -ti tcp:"$PORT" 2>/dev/null); then
  echo "Stopping existing process on port ${PORT}..."
  kill -9 $pids 2>/dev/null || true
  sleep 0.3
fi

echo "Starting Epsilon Health (phone view) at ${URL}"
# Serve with no-store so Safari can't hang on stale CSS/HTML between iterations.
python3 - <<'PY' &
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

ThreadingHTTPServer(("", 8086), NoCacheHandler).serve_forever()
PY
SERVER_PID=$!

cleanup() {
  echo
  echo "Stopping server..."
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}

trap cleanup INT TERM

sleep 0.5
open -a Safari "$URL"
sleep 0.6
osascript <<EOF >/dev/null 2>&1 || true
tell application "Safari"
  activate
  if (count of windows) > 0 then
    set bounds of front window to {80, 40, $((80 + PHONE_W)), $((40 + PHONE_H))}
  end if
end tell
EOF

echo "Server running (no-cache). Press Ctrl+C to stop."
wait "$SERVER_PID"

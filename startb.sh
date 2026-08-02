#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$ROOT/design-b"
PORT=8081
URL="http://localhost:${PORT}"

cd "$DIR"

if pids=$(lsof -ti tcp:"$PORT" 2>/dev/null); then
  echo "Stopping existing process on port ${PORT}..."
  kill -9 $pids 2>/dev/null || true
  sleep 0.3
fi

echo "Starting Epsilon Health Design B at ${URL}"
python3 -m http.server "$PORT" &
SERVER_PID=$!

cleanup() {
  echo
  echo "Stopping server..."
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}

trap cleanup INT TERM

sleep 0.4
open -a Safari "$URL"

echo "Server running (Design B). Press Ctrl+C to stop."
wait "$SERVER_PID"

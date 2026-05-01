#!/usr/bin/env bash
# GeoIntel Dashboard — quick launcher
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-3000}"

# Check if already running
if curl -sf --max-time 1 "http://localhost:$PORT/api/status" > /dev/null 2>&1; then
  echo "  ◈ Dashboard already running at http://localhost:$PORT"
  open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || true
  exit 0
fi

echo ""
echo "  ◈ GEOPOLITICAL INTEL DASHBOARD"
echo "  ─────────────────────────────"
echo "  Starting server..."

cd "$DIR"
node server.js &
SERVER_PID=$!

# Wait for server
for i in {1..8}; do
  sleep 1
  if curl -sf --max-time 1 "http://localhost:$PORT/api/status" > /dev/null 2>&1; then
    echo "  ✓ Server ready at http://localhost:$PORT"
    echo "  ✓ PID $SERVER_PID (kill with: kill $SERVER_PID)"
    echo ""
    open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || echo "  → Open http://localhost:$PORT in your browser"
    wait $SERVER_PID
    exit 0
  fi
done

echo "  ✗ Server failed to start. Check logs above."
exit 1

#!/usr/bin/env bash
# Desktop Lighthouse run against the production build. Fails below the performance budget.
# Lighthouse >= 12 dropped the PWA category: installability is asserted in e2e/pwa.spec.ts
# through Chrome's own installability check (CDP Page.getInstallabilityErrors).
set -euo pipefail
PORT=4180
MIN_PERF=${MIN_PERF:-85}
npm run build >/dev/null
npx vite preview --port "$PORT" --strictPort >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
sleep 3
CHROME_PATH=$(node -e "console.log(require('@playwright/test').chromium.executablePath())") \
  npx --yes lighthouse@12 "http://localhost:$PORT/" --preset=desktop \
  --only-categories=performance,accessibility,best-practices \
  --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=./lighthouse-report.json --quiet
node -e "
const r = require('./lighthouse-report.json');
let ok = true;
for (const [k, v] of Object.entries(r.categories)) console.log(k.padEnd(16), Math.round(v.score * 100));
if (r.categories.performance.score * 100 < $MIN_PERF) { console.error('Performance below $MIN_PERF'); ok = false; }
process.exit(ok ? 0 : 1)"

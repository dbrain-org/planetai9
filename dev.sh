#!/usr/bin/env bash
# PlanetAI9 — local ortamı ayağa kaldır.
# Kullanım:  ./dev.sh            (her şeyi başlat)
#            ./dev.sh stop       (durdur)
set -euo pipefail
cd "$(dirname "$0")"

API_PORT=8077
WEB_PORT=3010   # 3000 LLM Radar'da kullanılıyor
API_LOG=/tmp/planetai-api.log
WEB_LOG=/tmp/planetai-web.log

if [ "${1:-}" = "stop" ]; then
  pkill -f "uvicorn planetai_api" 2>/dev/null || true
  pkill -f "next-server" 2>/dev/null || true
  pkill -f "next start -p $WEB_PORT" 2>/dev/null || true
  pkill -f "next dev -p 3000 -p $WEB_PORT" 2>/dev/null || true
  docker compose -f infra/docker-compose.yml stop
  echo "durduruldu."
  exit 0
fi

echo "▶ postgres + redis"
docker compose -f infra/docker-compose.yml up -d

echo "▶ db migrate + seed"
uv run alembic upgrade head
uv run planetai-ingest seed

echo "▶ API  → http://localhost:$API_PORT"
pkill -f "uvicorn planetai_api" 2>/dev/null || true
nohup uv run uvicorn planetai_api.main:app --port "$API_PORT" --reload >"$API_LOG" 2>&1 &
disown || true

echo "▶ WEB  → http://localhost:$WEB_PORT"
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev -p 3000 -p $WEB_PORT" 2>/dev/null || true
# macOS'ta dosya izleyici limiti (EMFILE) nedeniyle Next.js ara sıra düşebiliyor.
# Polling modu daha stabil; özellikle uzun agent oturumlarında bağlantı kopmasını azaltır.
nohup bash -lc "cd apps/web && WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true npm run dev -- -H 0.0.0.0 -p $WEB_PORT" >"$WEB_LOG" 2>&1 &
disown || true

sleep 5
echo
if curl -sf "http://127.0.0.1:$API_PORT/api/v1/healthz" >/dev/null \
  && curl -sf "http://127.0.0.1:$WEB_PORT/" >/dev/null; then
  echo "  ✅  Site:  http://localhost:$WEB_PORT"
  echo "      API:   http://localhost:$API_PORT/docs"
else
  echo "  ⚠️  Servisler henüz hazır değil — loglar:"
  echo "      API: $API_LOG"
  echo "      WEB: $WEB_LOG"
  echo "      Site: http://localhost:$WEB_PORT"
  echo "      API:  http://localhost:$API_PORT/docs"
fi
echo
echo "  İlk kez veya güncel haber için:  uv run planetai-ingest collect && uv run planetai-ingest trends"

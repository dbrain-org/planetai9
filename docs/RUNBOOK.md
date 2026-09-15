# Runbook — local development

## Prerequisites
- `uv` (Python), Node 20+, Docker

## 1. Infrastructure
```bash
docker compose -f infra/docker-compose.yml up -d      # postgres:5442, redis:6379
```

## 2. Backend (Python workspace)
```bash
uv sync --all-packages
cp .env.example .env                                   # edit if needed
uv run alembic upgrade head                            # create schema
uv run planetai-ingest seed                            # load sources/entities/topics
uv run planetai-ingest collect                         # one full collection pass
uv run planetai-ingest trends                          # trend snapshots + top signals
```

Run the API:
```bash
uv run uvicorn planetai_api.main:app --port 8077 --reload
# docs at http://localhost:8077/docs
```

Run the scheduler (long-lived; does seed + warm collect on start):
```bash
uv run planetai-ingest scheduler
```

## 3. Frontend
```bash
cd apps/web
npm install
cp .env.example .env.local                             # PLANETAI_API_URL=http://localhost:8077
npm run dev                                            # http://localhost:3000
```

## YouTube videos
Set in `.env`:
```
PLANETAI_YOUTUBE_API_KEY=...
PLANETAI_YOUTUBE_CHANNEL_ID=UC...
```
then `uv run planetai-ingest collect --kinds youtube`.

## CLI reference
| command | purpose |
|---|---|
| `planetai-ingest seed` | upsert seed YAML into DB (idempotent) — sources, entities, topics, authors, marketplace apps, Türkiye link cards |
| `planetai-ingest collect [--kinds rss,arxiv,youtube]` | one collection pass (fetches OG images, busts API cache) |
| `planetai-ingest trends` | recompute trend snapshots + refresh top signals |
| `planetai-ingest scheduler` | APScheduler loop (10m news / 60m arxiv+yt / 30m trends) |
| `python -m planetai_api.moderate list` | list AI Marketplace submissions with status |
| `python -m planetai_api.moderate approve <slug>` | publish a pending marketplace app |
| `python -m planetai_api.moderate reject <slug>` | reject a submission |

## Köşe yazısı ekleme

**Yazar stüdyosu (`/yazar`)** — yazarın kendisi tarayıcıdan yazar, taslak saklar, yayınlar.
Anahtarlar `authors.api_key_hash` sütununda (SHA-256). Seed ile basılır:
`infra/seed/editorial.yaml` → `api_key_hash` + isteğe bağlı `is_moderator`, sonra
`uv run planetai-ingest seed`. Yazar `/yazar` adresinden slug + plaintext secret ile girer.
Hiçbir yazarda hash yoksa (ve legacy `AUTHOR_KEYS` de boşsa) `/yazar` 404 döner.

Legacy: `PLANETAI_AUTHOR_KEYS` / `AUTHOR_KEYS` hâlâ fallback olarak çalışır; yeni kurulumda
gerekmez.

**Marketplace moderasyonu yazar stüdyosundan** — `is_moderator: true` olan yazarlar
(veya legacy `MODERATOR_AUTHORS` listesi) `/yazar` içinde "Marketplace Başvuruları"
sekmesini görür; topluluk başvurularını oradan onaylar/reddeder. Aynı işi `/yonetim` + admin
token da yapar. İkisinden biri tanımlıysa `/marketplace/queue` erişilebilir olur.

**Türkiye sayfası kartları** — moderatör yazarlar `/yazar` → "Türkiye" sekmesinden
"Açık Veri Kaynakları" ve "Ekosistem" kartlarını ekler/düzenler/siler/sıralar (DB tablosu
`curated_links`). `planetai-ingest seed` eksik YAML kartlarını **ekler**; mevcut kartların
içeriğine dokunmaz (panel kaynak olmaya devam eder).

**Alternatif — seed** — `infra/seed/editorial.yaml` içindeki `columns:` listesine ekle, sonra `uv run planetai-ingest seed`:
```yaml
columns:
  - slug: 2026-yapay-zeka-ajanlari
    author: ayhan-demirci
    title: "2026: Ajanlar yılı mı, balon mu?"
    dek: "Kısa özet / spot cümle."
    published_at: 2026-09-08
    body: |
      İlk paragraf...

      ## Ara başlık
      İkinci paragraf...
```
`body` düz metin; paragraflar boş satırla ayrılır, `## ` ile başlayan satır alt başlık olur. Seed idempotent — aynı slug'ı tekrar çalıştırmak yazıyı günceller.

## Ports
| service | port | note |
|---|---|---|
| postgres | 5442 | 5432/5433 avoided — local Postgres already runs there |
| redis | 6379 | |
| api | 8077 | |
| web | 3000 | use another port if taken |

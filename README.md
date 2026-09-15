# PlanetAI9

**Explore the AI Universe.** — Yapay zekâ dünyasındaki her sinyali tek platformda toplayan,
filtreleyen, kategorize eden ve ilişkilendiren AI haber/intelligence platformu. Türkçe birincil,
İngilizce ikincil.

> ONE PLANET. EVERY AI SIGNAL.

---

## İçindekiler

- [Ne yapar](#ne-yapar)
- [Yüzeyler / route'lar](#yüzeyler--routelar)
- [Hızlı başlangıç (local)](#hızlı-başlangıç-local)
- [Production'a çıkış](#productiona-çıkış)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Operasyon](#operasyon)
- [Teknoloji yığını](#teknoloji-yığını)
- [Monorepo yapısı](#monorepo-yapısı)
- [Dokümanlar](#dokümanlar)

---

## Ne yapar

- **Haber toplama** — ~50 RSS/Atom kaynağı (dünya + Türkiye) + arXiv + PlanetAI9 YouTube.
  Kural tabanlı sınıflandırma, deduplication, olay (event) kümeleme ve önem skorlaması. **LLM yok.**
- **Türkiye odağı** — Türkçe kaynaklar ayrı işaretli (`sources.lang = tr`); `/turkiye` sayfası
  ekosistem raporu + "Türkiye Data" (açık veri kaynakları). Kart listeleri `/yazar` → "Türkiye"
  sekmesinden düzenlenir.
- **TR/EN dil altyapısı** — her haber origin dilinde saklanır; `event_translations` tablosu +
  API `?lang=` servis yolu hazır. Şu an bir çeviri sağlayıcısı bağlı **değil** — çeviri satırları
  eklendiğinde (elle ya da ileride bir sağlayıcıyla) okuyucunun diline göre servis edilir.
- **AI Marketplace** — topluluğun paylaştığı açık AI araçları. Başvurular `pending` düşer, yalnızca
  onaylananlar yayında.
- **Köşe yazıları** — yazarlar `/yazar` stüdyosundan kendi köşe yazılarını yazar, taslak tutar, yayınlar.
- **Moderasyon** — `/yonetim` (admin token) **veya** moderatör yetkili yazarlar `/yazar` içindeki
  "Marketplace Başvuruları" sekmesinden onaylar/reddeder.
- **LLMRadar** — ayrı bir alt proje ( `llmradar.planetai9.com` ), navbar'dan link.

## Yüzeyler / route'lar

| Route | Açıklama | Erişim |
|---|---|---|
| `/` | Ana sayfa — hero, öne çıkanlar, son haberler, videolar | herkes |
| `/news` | Gündem — sol sidebar'da bölge / zaman / sıralama filtreleri | herkes |
| `/news/[slug]` | Haber detayı (kaynaklar, ilgili haberler) | herkes |
| `/turkiye` | Türkiye'de Yapay Zekâ + Türkiye Data | herkes |
| `/yazarlar`, `/yazarlar/[slug]` | Köşe yazıları ve yazar profilleri | herkes |
| `/marketplace` | AI Marketplace + "uygulamanı öner" formu | herkes |
| `/videos`, `/videos/[id]` | PlanetAI9 YouTube içerikleri | herkes |
| `/trends`, `/entities/…`, `/search` | Trend konular, entity sayfaları, arama | herkes |
| `/rss.xml` | RSS akışı (tarayıcıda okunabilir XSL'li) | herkes |
| **`/yazar`** | **Yazar stüdyosu** — köşe yazısı editörü + (yetkiliyse) marketplace moderasyonu + Türkiye kartları | `authors.api_key_hash` (seed) |
| **`/yonetim`** | **Marketplace moderasyon paneli** | `PLANETAI_ADMIN_TOKEN` |

`/yazar` ve `/yonetim` ilgili secret tanımlı değilse **404** döner (gizli kalır) ve `robots.txt`'de disallow'dur.

## Hızlı başlangıç (local)

Gereksinimler: **Docker**, **[uv](https://docs.astral.sh/uv/)**, **Node 20+**.

```bash
git clone https://github.com/byznrdincer/planetai9.git && cd planetai9
cp .env.example .env            # değerleri isteğe göre doldur (hepsi opsiyonel)
make install                    # uv sync + npm ci

./dev.sh                        # postgres+redis (docker) → migrate → seed → API :8077 → web :3010
#   Site:  http://localhost:3010
#   API:   http://localhost:8077/docs

# İlk haber verisi için:
uv run planetai-ingest collect          # bir toplama turu
uv run planetai-ingest trends           # trend + top-signal hesapla

./dev.sh stop                   # durdur
```

Kalıcı çalışması için (10 dk'da bir toplar): `make scheduler`.

## Production'a çıkış

Kendi sunucunda, tek `docker compose` yığını (postgres + redis + api + ingest + web):

```bash
cp infra/.env.prod.example infra/.env.prod
# infra/.env.prod içindeki TÜM zorunlu değerleri doldur (aşağıdaki tabloya bak)

make prod-up      # docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build
make prod-down    # durdur
```

Bundled Caddy ile TLS de isteğe bağlı:
```bash
make prod-up-caddy    # SITE_DOMAIN + DNS gerekir; Let's Encrypt sertifikayı otomatik alır
```

- `api` — açılışta `alembic upgrade head` → migration'lar otomatik. Healthcheck: `/api/v1/healthz`.
- `ingest` — `planetai-ingest scheduler`: açılışta seed + ilk toplama, sonra döngü (**haberler 10 dk**,
  arXiv/YouTube 60 dk, trendler 30 dk). Healthcheck: `planetai-ingest healthz`.
- `web` — **yalnızca `127.0.0.1:${WEB_PORT}`** dinler (dışa kapalı). Önüne reverse proxy koy: `make prod-up-caddy` veya kendi Nginx/Traefik.
- `backup` — **günlük otomatik `pg_dump`** (`pgbackups` volume, gzip + retention). Anlık: `make prod-backup`.
- `backup-offsite` *(profil `offsite`)* — `pgbackups` volume'ünü **S3 / B2 / R2 / MinIO**'ya kopyalar (`OFFSITE_S3_*` gerekir). Hepsi birden: `make prod-up-full`.
- Volume'ler: `pgdata`, `pgbackups`, `redisdata`, `caddy_data`.

### Deploy öncesi kontrol listesi

- [ ] `make check` yeşil (ruff · format · pytest · `alembic check` · web tsc · web build)
- [ ] `SITE_URL` https:// domain; `SITE_DOMAIN` sadece host; DNS sunucuya işaret ediyor
- [ ] `POSTGRES_PASSWORD`, `ADMIN_TOKEN`, `AUTHOR_KEYS` güçlü rastgele; ayrı kanaldan paylaşıldı
- [ ] `MODERATOR_AUTHORS` = marketplace onaylayacak yazar slug'ları (opsiyonel)
- [ ] `SENTRY_DSN` (önerilir) — bir test hatası tetikle, Sentry'ye düştüğünü doğrula
- [ ] `docker compose … ps` → `api`, `ingest`, `web` **healthy**
- [ ] Deploy sonrası bir kez `planetai-ingest seed` (eksik Türkiye Data kartları + LLM Radar SVG→JPG path fix)
- [ ] İlk `make prod-backup` başarılı; `pgbackups` volume'ünde dump var
- [ ] `robots.txt` / `sitemap.xml` doğru host ile çözülüyor; `/yonetim` ve `/yazar` girişi çalışıyor

## Ortam değişkenleri

Local'de `.env` (prefix `PLANETAI_`), prod'da `infra/.env.prod` (prefix'siz, compose eşler).
Gerçek `.env` dosyalarını **asla commit etme**.

| Local (`.env`) | Prod (`infra/.env.prod`) | Zorunlu? | Açıklama |
|---|---|---|---|
| `PLANETAI_DATABASE_URL` | *(compose kurar)* | evet | Postgres bağlantısı |
| `PLANETAI_REDIS_URL` | *(compose kurar)* | evet | Redis (cache + rate limit) |
| `PLANETAI_SITE_URL` | `SITE_URL` | evet (prod) | Public URL — CORS, canonical, sitemap, RSS |
| — | `POSTGRES_PASSWORD` | evet (prod) | Postgres parolası |
| `PLANETAI_ADMIN_TOKEN` | `ADMIN_TOKEN` | hayır | `/yonetim` paneli; boşsa panel 404 |
| `PLANETAI_AUTHOR_KEYS` | `AUTHOR_KEYS` | hayır | legacy `/yazar` fallback — `slug:secret,...`; asıl kaynak seed `api_key_hash` |
| `PLANETAI_MODERATOR_AUTHORS` | `MODERATOR_AUTHORS` | hayır | Marketplace onaylayabilen yazar slug'ları — `slug,slug2` |
| `PLANETAI_SENTRY_DSN` | `SENTRY_DSN` | hayır | Hata izleme (api + ingest); boşsa kapalı |
| — | `NEXT_PUBLIC_SENTRY_DSN` | hayır | Web istemci hata izleme |
| — | `SITE_DOMAIN` | `caddy` profili için | Sadece host (şemasız), örn. `planetai9.com` |
| — | `BACKUP_SCHEDULE` / `BACKUP_KEEP_*` | hayır | `backup` servisi cron + saklama (vars. `@daily` / 7·4·6) |
| `PLANETAI_YOUTUBE_API_KEY` | `YOUTUBE_API_KEY` | hayır | YouTube Data API v3 (video meta) |
| `PLANETAI_YOUTUBE_CHANNEL_ID` | — | hayır | Kanal id'si (handle scrape varsayılan) |
| `PLANETAI_CORS_ORIGINS` | *(compose = `SITE_URL`)* | hayır | Virgüllü liste |
| `PLANETAI_DOCS_ENABLED` | *(compose = `false`)* | hayır | `/docs` Swagger UI |
| `PLANETAI_RATE_LIMIT_DEFAULT` / `_SUBMIT` | aynı | hayır | API rate limitleri |

Ayarlanabilir tüm değerler: [`packages/shared/planetai_shared/settings.py`](packages/shared/planetai_shared/settings.py).

## Operasyon

### Veri tazeliği
Prod'da `ingest` konteyneri sürekli çalışır; haberler ~10 dk'da bir güncellenir. Manuel tetikleme:
`docker compose -f infra/docker-compose.prod.yml run --rm ingest planetai-ingest collect`.

### CLI (`planetai-ingest …`)
| Komut | İş |
|---|---|
| `seed` | Seed YAML'ları DB'ye yaz (idempotent) — kaynaklar, entity'ler, konular, yazarlar |
| `collect [--kinds rss,arxiv,youtube]` | Bir toplama turu |
| `trends` | Trend snapshot + top-signal yenile |
| `retag` | Mevcut olaylara konu eşleştirmesini yeniden çalıştır |
| `scheduler` | Uzun ömürlü zamanlayıcı döngüsü |

### Köşe yazısı ekleme
1. **`/yazar` stüdyosu** (önerilen) — yazar slug + anahtarıyla girer, editörden yazar/yayınlar.
   Anahtar hash'leri `infra/seed/editorial.yaml` → `api_key_hash` (seed ile DB'ye yazılır).
2. **Seed** — `infra/seed/editorial.yaml` içindeki `columns:` listesine ekle, `planetai-ingest seed`.

### Marketplace başvurusu onaylama
`/yonetim` (admin token) veya `is_moderator: true` yazar `/yazar` → "Marketplace
Başvuruları" sekmesi → Onayla / Reddet.

### Kaynak ekleme
`infra/seed/sources.yaml`'a satır ekle (`lang: tr` Türkçe kaynaklar için), `planetai-ingest seed`.
Ölü feed'ler `enabled: false` ile kapatılır.

### Testler ve kontroller
```bash
make check     # ruff check + format --check + pytest + web tsc + web build
```

## Teknoloji yığını

- **Frontend:** Next.js 15 (App Router, TypeScript), Tailwind, açık/koyu tema, TR/EN
- **Backend API:** Python + FastAPI, SQLAlchemy 2, slowapi rate limiting
- **Ingest:** Python worker'ları, APScheduler; feedparser + httpx + selectolax
- **Veritabanı:** PostgreSQL 16 (`pg_trgm`, `tsvector` FTS), Alembic migration'ları
- **Cache:** Redis 7
- **LLM:** İçerik pipeline'ında **yok** — sınıflandırma/skorlama kural tabanlı

## Monorepo yapısı

```
planetai/
├── apps/
│   ├── web/            # Next.js frontend
│   └── api/            # FastAPI backend
├── services/
│   └── ingest/         # kaynak toplayıcılar + pipeline + scheduler
├── packages/
│   └── shared/         # ortak ORM modelleri + settings
├── infra/              # docker-compose (dev + prod), alembic migrations, seed YAML
└── docs/
```

## Dokümanlar

| Doküman | İçerik |
|---|---|
| [docs/00-overview.md](docs/00-overview.md) | Ürün vizyonu, kapsam, MVP kararı |
| [docs/01-architecture.md](docs/01-architecture.md) | Sistem mimarisi, servisler, repo yapısı |
| [docs/02-data-model.md](docs/02-data-model.md) | Entity modeli, Postgres şeması |
| [docs/03-ingestion-pipeline.md](docs/03-ingestion-pipeline.md) | Toplama, extraction, dedup, scoring, trend engine |
| [docs/04-api.md](docs/04-api.md) | Backend REST API sözleşmesi |
| [docs/05-frontend.md](docs/05-frontend.md) | Next.js sayfa yapısı, route'lar, bileşenler |
| [docs/06-roadmap.md](docs/06-roadmap.md) | Yol haritası |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Local kurulum, CLI, portlar, editoryal işlemler |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Self-host production stack detayları |

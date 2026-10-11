# PharmaScope

**A drug availability API — scrapes public pharmaceutical sources, cross-references
shortages and recalls, and serves it as one queryable dataset.**

Searching for a medicine shouldn't mean checking three regulators separately.
PharmaScope ingests drug listings, shortage notices and recall/suspicious-drug
records, joins them on salt composition, and exposes the merged view over a single
fuzzy-search endpoint — so a query for "Insulin" returns the product, its price and
manufacturer, *and* whether it is currently in shortage or flagged.

> **Status:** working prototype, runs locally. No hosted instance.

---

## Architecture

Three parts, in the order data moves through them:

```
highway/              ETL — "build the dataset"
  scrapers/
    openfda_scraper.py    US FDA  (openFDA)
    india_scraper.py      Indian listings
  extract_salts.py        normalize salt composition (the join key)
  builder.py              assemble layered build
  promote.py              promote a build to current
  cleanup_builds.py       prune old builds
        │
        ▼  layered JSON  (API/JSON/layerN_*.json, current_build.json)
        │
API/                  Express 5 service
  routes/search.js        fuzzy search + filter + paginate  (Fuse.js)
  routes/trends.js        trend aggregation
  routes/ai.js            natural-language querying
  services/ollamaService.js   local LLM via Ollama
  utils/dataLoader.js     loads layers into memory, node-cache
        │
        ▼  JSON
        │
pharmasynapse-ui/     React dashboard — search, drug detail, visualizations
```

The dataset is **versioned as builds**: a scrape produces a new build, `promote.py`
makes it current, and the API reads whatever `current_build.json` points at. That
means a bad scrape can be rolled back without re-running the pipeline.

## The AI route

`POST /api/ai` answers questions in natural language. It runs against **Ollama
locally** (`services/ollamaService.js`) rather than a hosted provider, so no drug
query data leaves the machine.

## API

Base URL `http://localhost:3000`. No authentication.

| Endpoint | Purpose |
|---|---|
| `GET /api/search` | Fuzzy search by `drug` or `condition`, with filtering, sorting, pagination |
| `GET /api/trends` | Aggregated trend data |
| `POST /api/ai` | Natural-language query via local Ollama |
| `GET /api/db-status` | Which build is loaded, and record counts |

`GET /api/search` supports `drug`, `condition`, `page`, `limit`, `min_price`,
`max_price`, `manufacturer`, `min_rating`, and `sort` (`relevance`, `price_asc`,
`price_desc`, `rating`). Responses carry a `meta` block with
`total`/`page`/`limit`/`total_pages` alongside `data`.

Each result is enriched with the joined records:

```json
{
  "product_name": "Insulin Glargine",
  "manufacturer": "Sanofi",
  "price": "₹500.00",
  "salt_composition": "Insulin Glargine (100IU/ml)",
  "source": "medicines",
  "layer1_reviews":  { "avg_rating": 8.5, "conditions": ["Diabetes Type 1"] },
  "shortages":       [ { "Generic Name": "Insulin Glargine", "Status": "Resolved" } ],
  "suspicious":      []
}
```

Full parameter and response reference: [`API/API_DOCUMENTATION.md`](API/API_DOCUMENTATION.md).

## Running it

**Prerequisites:** Node 18+, Python 3.10+, and [Ollama](https://ollama.com) if you
want the `/api/ai` route.

```bash
# API
cd API
npm install
node server.js            # http://localhost:3000
```

```bash
# UI
cd pharmasynapse-ui/pharmasynapse-ui
npm install
npm run dev
```

The repo ships with a prebuilt dataset, so the API works without running the
pipeline. To rebuild from source:

```bash
cd highway
python scrapers/openfda_scraper.py
python scrapers/india_scraper.py
python extract_salts.py
python builder.py
python promote.py
```

Confirm what's loaded:

```bash
curl http://localhost:3000/api/db-status
```

## Limitations

- **This is not a medical or regulatory source.** Data is scraped best-effort from
  public datasets and may be stale, incomplete or mis-joined. **Never use it to make
  a decision about medication** — check the official regulator.
- **Salt-composition matching is heuristic.** Joins are string-normalized, so
  formulations can mismatch or fail to match.
- **Coverage is US (openFDA) and India only.**
- **No auth and no rate limiting** — it binds `0.0.0.0`, so don't expose it as-is.
- **No tests.**

## Known issues

- The UI lives at `pharmasynapse-ui/pharmasynapse-ui/` — one directory level too deep.
- `API/JSON/one.html` is a stray empty file.

## License

ISC (per `API/package.json`). Scraped data remains subject to its original sources' terms.

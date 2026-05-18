# PharmaSynapse: Highway Architecture Documentation

> **A Drug Intelligence System with Pre-Computed Data Highways**

---

## � TL;DR — What Is This Project?

**In one sentence:** PharmaSynapse is an app that helps users search for any medicine and instantly see its price, cheaper alternatives, patient reviews, safety alerts, and manufacturer trustworthiness.

### The Problem
We have 300MB+ of raw drug data in CSV files. If we search these files every time a user types a query, it takes **3-5 seconds per search**. That's unacceptable.

### The Solution: "Highways"
Instead of reading CSVs at runtime, we **pre-process everything ONCE** into a single optimized `master_db.json` file (43MB). When the app starts, it loads this JSON into memory. Now every search is **instant (<1 millisecond)**.

### What Does the Output Look Like?

When a user searches "Dolo 650", they instantly get:

| Field | Value | Source |
|-------|-------|--------|
| **Name** | Dolo 650 | Master drug database |
| **Price** | ₹30 | Master drug database |
| **Cheapest Generic** | ₹5 | Pre-calculated from all drugs with same ingredient |
| **You Save** | 83% | Pre-calculated |
| **Clinical Rating** | 8.5/10 | Aggregated from 1000+ patient reviews |
| **Vendor Status** | ✅ Safe | Checked against manufacturer blacklist |
| **Shortage** | No | FDA shortage database |

**All of this appears in <1 millisecond**, not 3 seconds.

---

## �📋 Table of Contents

1. [Project Overview](#project-overview)
2. [The Problem We're Solving](#the-problem-were-solving)
3. [The Highway Architecture](#the-highway-architecture)
4. [Data Sources & Connections](#data-sources--connections)
5. [The 5-Layer Intelligence Model](#the-5-layer-intelligence-model)
6. [Technical Implementation](#technical-implementation)
7. [File Structure](#file-structure)
8. [How to Use](#how-to-use)
9. [Performance Comparison](#performance-comparison)

---

## 🎯 Project Overview

**PharmaSynapse** is a drug intelligence dashboard that provides instant insights about medicines, including:

- **Price Arbitrage**: Find cheaper generic alternatives to branded drugs
- **Clinical Ratings**: Patient reviews aggregated by drug salt
- **Vendor Risk Assessment**: Flag manufacturers with recall history
- **Shortage Alerts**: Identify drugs currently in supply shortage

### The Core Innovation: Pre-Computed "Highways"

Instead of parsing 300MB+ CSV files on every user search (which is SLOW), we:

1. **BUILD ONCE**: Process all raw data through an ETL pipeline
2. **DUMP TO JSON**: Create `master_db.json` - a pre-computed index
3. **LOAD ONCE**: Your app loads this JSON once at startup
4. **SEARCH INSTANTLY**: Every lookup is now O(1) dictionary access

```
┌─────────────────────────────────────────────────────────────┐
│                    THE HIGHWAY CONCEPT                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   RAW DATA (SLOW)              HIGHWAY (FAST)               │
│   ══════════════               ═══════════════              │
│                                                             │
│   CSV Files ────┐              ┌──► master_db.json          │
│   (300MB+)      │   builder.py │      (43MB)                │
│                 ├──────────────┤                            │
│   APIs ─────────┤              │   Pre-computed:            │
│                 │              │   • search_index           │
│   Reviews ──────┘              │   • price comparisons      │
│                                │   • clinical ratings       │
│                                │   • vendor flags           │
│                                └──────────────────────────  │
│                                                             │
│   Search Time: 2-5 seconds     Search Time: <1 millisecond  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔴 The Problem We're Solving

### Before: Runtime CSV Parsing

```python
# ❌ SLOW - This is what we DON'T want
def search_drug(query):
    df = pd.read_csv("medicines.csv")  # 2-3 seconds to load 300MB!
    result = df[df['name'].str.contains(query)]
    return result

# User searches "Dolo 650" → waits 3 seconds
# User searches "Crocin" → waits 3 seconds again!
```

### After: Highway Pre-computation

```python
# ✅ FAST - This is our approach
# Load once at startup
with open('master_db.json') as f:
    db = json.load(f)  # Takes 1-2 seconds, but only ONCE

def search_drug(query):
    drug_id = db['search_index'].get(query.lower())  # O(1) lookup!
    return db['drugs'].get(drug_id)

# User searches "Dolo 650" → instant (<1ms)
# User searches "Crocin" → instant (<1ms)
```

---

## 🛣️ The Highway Architecture

### What is a "Highway"?

A **Highway** is a pre-computed data structure optimized for fast lookups. Just like real highways let you travel faster by avoiding local roads, data highways let you query faster by avoiding raw file parsing.

### Our Highway Structure

```
master_db.json
├── meta                    # Build metadata
│   ├── version
│   ├── generated_at
│   ├── total_drugs
│   └── unique_salts
│
├── search_index            # O(1) Name → ID Mapping
│   ├── "dolo 650" → "ID_000051"
│   ├── "crocin" → "ID_000102"
│   └── ...
│
└── drugs                   # Full Drug Profiles
    ├── "ID_000051"
    │   ├── name
    │   ├── manufacturer
    │   ├── price
    │   ├── salt
    │   ├── market_cheapest_price  ← Pre-computed!
    │   ├── savings               ← Pre-computed!
    │   ├── vendor_flag           ← Pre-computed!
    │   ├── clinical_rating       ← Pre-computed!
    │   └── in_shortage           ← Pre-computed!
    └── ...
```

### Why This Structure?

| Component | Purpose | Lookup Speed |
|-----------|---------|--------------|
| `search_index` | Map drug names to IDs | O(1) |
| `drugs` | Store full drug profiles by ID | O(1) |
| Pre-computed fields | Avoid runtime calculations | Already done! |

---

## 🔗 Data Sources & Connections

### Source Map

```
┌──────────────────────────────────────────────────────────────────┐
│                      DATA SOURCE CONNECTIONS                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SOURCE A                           SOURCE B                     │
│  ════════                           ════════                     │
│  medicine_data.csv (354MB)          drugsComTrain_raw.csv (83MB) │
│  • product_name                     • drugName                   │
│  • salt_composition ───────────────→ (matched via salt_clean)   │
│  • product_price                    • rating                     │
│  • product_manufactured             • condition                  │
│                │                                                 │
│                │ manufacturer_lower                              │
│                ▼                                                 │
│  SOURCE C                                                        │
│  ════════                                                        │
│  bad_actors.csv (optional)                                       │
│  • manufacturer_name ────────────→ vendor_flag: "HIGH RISK"     │
│                                                                  │
│  SOURCE D                                                        │
│  ════════                                                        │
│  Drugshortages.csv                                               │
│  • Generic Name ─────────────────→ in_shortage: true/false      │
│                                                                  │
│  SOURCE E (Future)                                               │
│  ════════════════                                                │
│  FDA APIs                                                        │
│  • Adverse Events API ───────────→ Layer 3: Safety signals      │
│  • Enforcement API ──────────────→ Layer 4: Recall history      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### The "Salt Cleaner" - Universal Join Key

**Problem**: Different sources use different naming conventions:
- Source A: `"Metformin Hydrochloride 500mg IP"`
- Source B: `"Metformin"`
- Source D: `"METFORMIN HCL"`

**Solution**: The `get_clean_salt()` function normalizes everything:

```python
get_clean_salt("Metformin Hydrochloride 500mg IP")  → "metformin"
get_clean_salt("Metformin")                          → "metformin"
get_clean_salt("METFORMIN HCL")                      → "metformin"
```

Now all sources can be joined on this clean salt key!

---

## 🏗️ The 5-Layer Intelligence Model

Each drug in our Highway is enriched with 5 layers of intelligence:

```
┌─────────────────────────────────────────────────────────────┐
│                    5-LAYER DRUG PROFILE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LAYER 1: CLINICAL                                    │   │
│  │ Source: Kaggle Reviews                               │   │
│  │ Data: clinical_rating (avg patient rating 1-10)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LAYER 2: ECONOMIC                                    │   │
│  │ Source: Internal Price Analysis                      │   │
│  │ Data: market_cheapest_price, savings %               │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LAYER 3: SAFETY                                      │   │
│  │ Source: FDA Adverse Events API                       │   │
│  │ Data: Serious adverse event counts (future)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LAYER 4: VENDOR                                      │   │
│  │ Source: bad_actors.csv + FDA Recalls                 │   │
│  │ Data: vendor_flag (Safe / HIGH RISK)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LAYER 5: SUPPLY                                      │   │
│  │ Source: Drugshortages.csv + Google Trends            │   │
│  │ Data: in_shortage, trend_signal                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Technical Implementation

### ETL Pipeline Flow

```
                    BUILDER.PY EXECUTION FLOW
    ═══════════════════════════════════════════════════════

    STARTUP
    ───────
    Load enrichment data into memory:
    • Reviews → ratings_by_salt dict
    • Bad Actors → vendor blacklist set
    • Shortages → shortage set

    PASS 1: COLLECTION
    ──────────────────
    For each chunk of 50,000 rows:
    │
    ├─► Extract: name, price, salt, manufacturer
    ├─► Clean: get_clean_salt(salt_composition)
    ├─► Store: products_by_salt[salt].append(product)
    │
    └─► End of pass: ~250,000 products grouped by ~5,000 salts

    PRICE ARBITRAGE CALCULATION
    ───────────────────────────
    For each salt:
    │
    ├─► Find minimum price among all products
    └─► min_price_by_salt[salt] = min(prices)

    PASS 2: ENRICHMENT
    ──────────────────
    For each product:
    │
    ├─► Lookup market_cheapest_price from min_price_by_salt
    ├─► Calculate savings = (price - cheapest) / price × 100
    ├─► Check vendor_flag from bad_actors set
    ├─► Attach clinical_rating from reviews
    ├─► Check in_shortage from shortages set
    │
    └─► Add to search_index and drugs dict

    OUTPUT
    ──────
    Write master_db.json (43MB compressed format)
```

### Key Functions

| Function | Purpose | Input → Output |
|----------|---------|----------------|
| `get_clean_salt()` | Normalize drug names | `"Metformin HCL 500mg"` → `"metformin"` |
| `parse_price()` | Extract numeric price | `"₹133.93"` → `133.93` |
| `calc_savings()` | Compute savings % | `(30, 5)` → `"83%"` |
| `load_reviews()` | Aggregate ratings | CSV → `{salt: avg_rating}` |
| `load_bad_actors()` | Build blacklist | CSV → `set(manufacturers)` |

---

## 📁 File Structure

```
PharmaLensv2/
│
├── indian data/
│   └── medicine_data.csv/
│       └── medicine_data.csv        # 354MB - Master drug database
│
├── layer-1 review rating/
│   └── drugsComTrain_raw.csv        # 83MB - Patient reviews
│
├── layer-3 fda api for adverse events/
│   └── api.txt                      # FDA adverse events endpoint
│
├── layer-4 fda api for vendor recalls/
│   └── fda api 2.txt                # FDA recalls endpoint
│
├── layer-5 shortages and trends/
│   ├── Drugshortages.csv            # Drug shortage list
│   └── google trends.txt            # PyTrends integration guide
│
├── bad_actors.csv                   # (Optional) Vendor blacklist
│
└── highway/                         # ⭐ THE HIGHWAY SYSTEM
    ├── builder.py                   # Main ETL script
    ├── salt_cleaner.py              # Salt normalization utilities
    ├── validate_v2.py               # Output validation
    │
    └── output/
        └── master_db.json           # 43MB - THE HIGHWAY INDEX
```

---

## 🚀 How to Use

### 1. Build the Highway (Run Once)

```bash
cd PharmaLensv2/highway
python builder.py
```

Output:
```
[05:25:52] PHARMASYNAPSE HIGHWAY BUILDER
[05:25:52] Loading clinical reviews...
[05:25:55] Loading vendor blacklist...
[05:25:55] PASS 1: Reading products...
[05:26:10] PASS 2: Building final index...
[05:26:15] BUILD COMPLETE!
  Total Drugs: 249,996
  Output Size: 43MB
```

### 2. Use in Your App

```python
import json

# Load once at startup
with open('highway/output/master_db.json', 'r') as f:
    HIGHWAY = json.load(f)

def search_drug(query: str) -> dict:
    """Instant drug lookup."""
    query_lower = query.lower().strip()
    drug_id = HIGHWAY['search_index'].get(query_lower)
    if drug_id:
        return HIGHWAY['drugs'][drug_id]
    return None

def find_cheaper_alternative(drug: dict) -> dict:
    """Find savings opportunity."""
    return {
        'current_price': drug['price'],
        'cheapest_available': drug['market_cheapest_price'],
        'you_save': drug['savings']
    }

# Example usage
drug = search_drug("Dolo 650")
print(f"Price: ₹{drug['price']}")
print(f"Cheapest Generic: ₹{drug['market_cheapest_price']}")
print(f"Savings: {drug['savings']}")
print(f"Rating: {drug['clinical_rating']}/10")
print(f"Vendor: {drug['vendor_flag']}")
```

---

## 📊 Performance Comparison

| Metric | CSV Parsing | Highway JSON |
|--------|-------------|--------------|
| **First Search** | 3-5 seconds | 1-2 seconds (load) |
| **Subsequent Searches** | 3-5 seconds each | <1 millisecond |
| **Memory at Runtime** | Loads 300MB per query | 43MB (pre-loaded) |
| **Calculations** | Runtime (slow) | Pre-computed (instant) |
| **File I/O** | Every search | Once at startup |

### Example: 100 User Searches

| Approach | Total Time |
|----------|------------|
| CSV Parsing | 100 × 3s = **5 minutes** |
| Highway JSON | 2s + 100 × 0.001s = **2 seconds** |

**Speed improvement: 150x faster!**

---

## 🔮 Future Enhancements

1. **FDA API Integration**: Call adverse events and recall APIs during build
2. **Fuzzy Search**: Add Levenshtein distance matching for typos
3. **Real-time Trends**: Integrate PyTrends for demand forecasting
4. **Incremental Updates**: Append new drugs without full rebuild
5. **Compression**: Use orjson + gzip for smaller file size

---

## 📝 Summary

| What | How |
|------|-----|
| **Problem** | 300MB CSV is too slow to parse per query |
| **Solution** | Pre-compute everything into JSON "Highway" |
| **Build** | Run `builder.py` once to generate `master_db.json` |
| **Use** | Load JSON at startup, O(1) lookups thereafter |
| **Result** | 150x faster searches, enriched with 5 layers |

---

*Built for the PharmaSynapse Hackathon — Instant Drug Intelligence at Your Fingertips*

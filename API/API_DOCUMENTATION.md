# Drug Analyzer API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:3000`

## Overview
The Drug Analyzer API aggregates drug data from multiple sources (Medicines, Shortages, Suspicious/Recalled Drugs). It provides high-performance fuzzy search, filtering, and pagination.

## Authentication
Currently, no authentication is required.

---

## Endpoints

### 1. Search Drugs
`GET /api/search`

Search for drugs by name or condition with advanced filtering and sorting.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `drug` | string | No* | - | Name of the drug (e.g., "Insulin", "Dolo"). *Required if `condition` is not provided.* |
| `condition` | string | No* | - | Medical condition (e.g., "Diabetes"). *Required if `drug` is not provided.* |
| `page` | number | No | `1` | Page number for pagination. |
| `limit` | number | No | `20` | Number of items per page. |
| `min_price` | number | No | - | Filter items with price >= value. |
| `max_price` | number | No | - | Filter items with price <= value. |
| `manufacturer`| string | No | - | Filter by manufacturer (partial case-insensitive match). |
| `min_rating` | number | No | - | Filter by average rating (0-10). |
| `sort` | string | No | `relevance`| Sort options: `price_asc`, `price_desc`, `rating`. |

#### Response Structure

```json
{
  "meta": {
    "total": 150,      // Total matching records found
    "page": 1,         // Current page
    "limit": 20,       // Items per page
    "total_pages": 8   // Total pages available
  },
  "query": {
    "drug": "Insulin",
    "condition": "Diabetes",
    ...
  },
  "data": [
    {
      "product_name": "Insulin Glargine",
      "manufacturer": "Sanofi",
      "price": "₹500.00",
      "salt_composition": "Insulin Glargine (100IU/ml)",
      "description": "Used for managing diabetes...",
      "source": "medicines",
      "layer1_reviews": {
        "avg_rating": 8.5,
        "conditions": ["Diabetes Type 1", "Diabetes Type 2"]
      },
      // Enriched Data
      "shortages": [
        {
           "Generic Name": "Insulin Glargine",
           "Status": "Resolved",
           "Presentation": "Vial"
        }
      ],
      "suspicious": []
    }
  ]
}
```

#### Error Responses
- **400 Bad Request**: If neither `drug` nor `condition` is provided.
- **404 Not Found**: If no records match the criteria.
- **500 Internal Server Error**: Server processing error.

---

## Performance Notes
- **Response Time**: 
  - First Request (Cold): ~150ms
  - Subsequent Requests (Cached): ~5ms
- **Caching**: Responses are cached for 5 minutes.
- **Search Logic**: 
  - **Exact Match**: Highest priority.
  - **Fuzzy Match**: Handles typos (e.g., "Zovrax" -> "Zovirax").
  - **Optimized**: Drug search uses partitioned indices (A-Z) for speed.

---

## Example Requests

**1. Basic Drug Search**
```bash
curl "http://localhost:3000/api/search?drug=Paracetamol"
```

**2. Condition Search with High Rating**
```bash
curl "http://localhost:3000/api/search?condition=Fever&min_rating=8"
```

**3. Complex Filter (Page 2, Cheap, Sorted by Price)**
```bash
curl "http://localhost:3000/api/search?drug=Metformin&max_price=100&sort=price_asc&page=2"
```

# Healthcare MCP Worker - API Reference

Base URL: `https://healthcare-mcp-server.pierretokns.workers.dev`

All endpoints accept `POST` requests with JSON payloads (except the root GET endpoint).

## Health Check

### GET /

Returns server status and available tools.

**Request:**
```bash
curl https://healthcare-mcp-server.pierretokns.workers.dev/
```

**Response:**
```json
{
  "status": "ok",
  "message": "Healthcare MCP Server on Cloudflare Workers",
  "version": "1.0.0",
  "tools": [
    "fda_drug_lookup",
    "pubmed_search",
    "clinical_trials_search",
    "lookup_icd_code",
    "calculate_bmi",
    "medrxiv_search",
    "ncbi_bookshelf_search",
    "health_topics_search"
  ]
}
```

---

## FDA Drug Lookup

Search FDA adverse event data for drug information.

### POST /fda_drug_lookup

**Request:**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/fda_drug_lookup \
  -H "Content-Type: application/json" \
  -d '{
    "drug_name": "aspirin",
    "search_type": "general"
  }'
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `drug_name` | string | required | Name of the drug to search |
| `search_type` | string | "general" | Type: 'general', 'label', or 'adverse_events' |

**Response:**
```json
{
  "status": "success",
  "drug_name": "aspirin",
  "search_type": "general",
  "results": [...],
  "total_records": 1500
}
```

---

## PubMed Search

Search medical literature from PubMed.

### POST /pubmed_search

**Request:**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/pubmed_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "diabetes treatment",
    "max_results": 5
  }'
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search query (keywords, authors, MeSH terms) |
| `max_results` | number | 5 | Maximum results to return (max 20) |

**Response:**
```json
{
  "status": "success",
  "query": "diabetes treatment",
  "total_results": 45230,
  "pubmed_ids": ["35241234", "35241233", "35241232"]
}
```

---

## Clinical Trials Search

Find clinical trials by condition and status.

### POST /clinical_trials_search

**Request:**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/clinical_trials_search \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "Type 2 Diabetes",
    "status": "recruiting"
  }'
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `condition` | string | required | Medical condition |
| `status` | string | "recruiting" | Trial status: recruiting, active, completed, etc. |

**Response:**
```json
{
  "status": "success",
  "condition": "Type 2 Diabetes",
  "trial_status": "recruiting",
  "total_studies": 342,
  "studies": [
    {
      "nct_id": "NCT04567890",
      "title": "Study of GLP-1 receptor agonist in diabetes",
      "status": "Recruiting"
    }
  ]
}
```

---

## ICD-10 Code Lookup

Look up ICD-10 diagnosis codes.

### POST /lookup_icd_code

**Request (by code):**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/lookup_icd_code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "E11"
  }'
```

**Request (by description):**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/lookup_icd_code \
  -H "Content-Type: application/json" \
  -d '{
    "description": "diabetes"
  }'
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `code` | string | optional | ICD-10 code (e.g., "E11") |
| `description` | string | optional | Condition description |

**Response (by code):**
```json
{
  "status": "success",
  "code": "E11",
  "description": "Type 2 diabetes mellitus"
}
```

**Response (by description):**
```json
{
  "status": "success",
  "query": "diabetes",
  "matches": {
    "E11": "Type 2 diabetes mellitus",
    "E10": "Type 1 diabetes mellitus"
  }
}
```

---

## BMI Calculator

Calculate Body Mass Index from height and weight.

### POST /calculate_bmi

**Request:**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/calculate_bmi \
  -H "Content-Type: application/json" \
  -d '{
    "height_meters": 1.75,
    "weight_kg": 70
  }'
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `height_meters` | number | required | Height in meters (e.g., 1.75) |
| `weight_kg` | number | required | Weight in kilograms (e.g., 70) |

**Response:**
```json
{
  "status": "success",
  "bmi": 22.86,
  "category": "Normal",
  "height_meters": 1.75,
  "weight_kg": 70
}
```

**BMI Categories:**
- Underweight: < 18.5
- Normal: 18.5 - 24.9
- Overweight: 25 - 29.9
- Obese: ≥ 30

---

## MedRxiv Search

Search biomedical preprints.

### POST /medrxiv_search

**Request:**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/medrxiv_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CRISPR gene therapy",
    "sort_by": "rel"
  }'
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search query |
| `sort_by` | string | "rel" | Sort field: rel (relevance), new (newest) |

**Response:**
```json
{
  "status": "success",
  "query": "CRISPR gene therapy",
  "total_results": 234,
  "preprints": [
    {
      "title": "CRISPR-Cas9 for Duchenne Muscular Dystrophy",
      "authors": "Smith J, Johnson K",
      "date": "2024-01-15",
      "abstract": "We demonstrate efficacy of CRISPR-Cas9..."
    }
  ]
}
```

---

## NCBI Bookshelf Search

Search medical reference books and textbooks.

### POST /ncbi_bookshelf_search

**Request:**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/ncbi_bookshelf_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "pharmacology"
  }'
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search query |

**Response:**
```json
{
  "status": "success",
  "query": "pharmacology",
  "total_results": 145,
  "book_ids": ["NBK123456", "NBK123457"]
}
```

---

## Health Topics Search

Search health information from NIH.

### POST /health_topics_search

**Request:**
```bash
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/health_topics_search \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "hypertension"
  }'
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `topic` | string | required | Health topic |

**Response:**
```json
{
  "status": "success",
  "topic": "hypertension",
  "content": "Hypertension, or high blood pressure, is a serious condition..."
}
```

---

## Error Responses

All endpoints return standardized error responses:

**Response:**
```json
{
  "status": "error",
  "error_message": "Description of what went wrong"
}
```

**Common HTTP Status Codes:**
| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 404 | Not Found (invalid endpoint) |
| 405 | Method Not Allowed |
| 500 | Internal Server Error |

---

## Rate Limiting

- No rate limiting enforced per request
- Cloudflare plan limits apply
- Consider caching for repeated requests

## Performance Tips

1. **Cache Results** - Store API responses locally when possible
2. **Batch Requests** - Combine multiple queries in a single request
3. **Limit Results** - Use `max_results` parameter to reduce payload
4. **Reuse Sessions** - Maintain connection for multiple requests

## Security Notes

- All requests are served over HTTPS
- No authentication currently required
- Consider implementing token-based auth for production
- API keys for external services are stored securely in Worker environment

---

For more information, see:
- **CLOUDFLARE-DEPLOYMENT.md** - Deployment and configuration
- **DEPLOYMENT-CHECKLIST.md** - Quick start guide

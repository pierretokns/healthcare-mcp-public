# Healthcare MCP Server - Cloudflare Workers Deployment Guide

## Overview

This guide walks you through deploying the Healthcare MCP Server to Cloudflare Workers with minimal configuration changes. The three essential files have been created to enable deployment on Cloudflare's serverless platform.

## Files Created

### 1. `wrangler.jsonc` - Worker Configuration

This configuration file tells Cloudflare how to build and deploy your Worker:

```json
{
  "name": "healthcare-mcp-server",
  "main": "src/index.ts",
  "compatibility_date": "2025-11-12",
  "compatibility_flags": [
    "nodejs_compat"  // Essential for Node.js API compatibility
  ],
  "vars": {
    "CACHE_TTL": "86400"
  }
}
```

**Key Features:**
- **nodejs_compat**: Enables Node.js compatibility, allowing use of node:http, node:buffer, node:crypto, etc.
- **main**: Points to the TypeScript entry point
- **vars**: Non-sensitive environment variables

### 2. `src/index.ts` - Worker Entry Point

This TypeScript file contains the main Worker class that exposes your healthcare tools as HTTP endpoints:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handler = new HealthcareMCP(env);
    return handler.fetch(request);
  }
};
```

**Implemented Tools:**
- **fda_drug_lookup**: Search FDA drug adverse event data
- **pubmed_search**: Search medical literature via PubMed
- **clinical_trials_search**: Find clinical trials by condition
- **lookup_icd_code**: Get ICD-10 diagnosis codes
- **calculate_bmi**: Calculate BMI from height/weight
- **medrxiv_search**: Search biomedical preprints
- **ncbi_bookshelf_search**: Search medical reference books
- **health_topics_search**: Get health information from NIH

### 3. `package.json` - Updated Dependencies

Added Cloudflare Workers deployment tools and TypeScript support:

```json
{
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "deploy": "wrangler deploy",
    "dev:workers": "wrangler dev",
    "setup:workers": "npm install"
  }
}
```

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

This installs all required packages including Wrangler CLI and TypeScript types.

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser window to authenticate your Cloudflare account and creates credentials locally.

### 3. Deploy to Production

```bash
npm run deploy
```

This:
- Compiles TypeScript to JavaScript
- Uploads your Worker to Cloudflare
- Deploys to your account's Workers domain

Your Worker will be available at: `https://healthcare-mcp-server.pierretokns.workers.dev`

### 4. Test Your Deployment

```bash
# Test the health endpoint
curl https://healthcare-mcp-server.pierretokns.workers.dev/

# Test a tool
curl -X POST https://healthcare-mcp-server.pierretokns.workers.dev/calculate_bmi \
  -H "Content-Type: application/json" \
  -d '{"height_meters": 1.75, "weight_kg": 70}'
```

## Development

### Local Development

```bash
npm run dev:workers
```

This starts a local development server at `http://localhost:8787` where you can test changes before deployment.

### Making Changes

1. Edit `src/index.ts` to modify tool logic
2. Changes auto-reload during `npm run dev:workers`
3. Test locally before deploying with `npm run deploy`

## API Endpoints

Each tool is accessible via HTTP POST:

### FDA Drug Lookup

```bash
POST /fda_drug_lookup
Content-Type: application/json

{
  "drug_name": "aspirin",
  "search_type": "general"
}
```

### PubMed Search

```bash
POST /pubmed_search
Content-Type: application/json

{
  "query": "diabetes treatment",
  "max_results": 5
}
```

### Clinical Trials Search

```bash
POST /clinical_trials_search
Content-Type: application/json

{
  "condition": "Type 2 Diabetes",
  "status": "recruiting"
}
```

### ICD-10 Code Lookup

```bash
POST /lookup_icd_code
Content-Type: application/json

{
  "code": "E11",
  "description": "Type 2 diabetes"
}
```

### BMI Calculator

```bash
POST /calculate_bmi
Content-Type: application/json

{
  "height_meters": 1.75,
  "weight_kg": 70
}
```

### Other Tools

Similar POST endpoints exist for:
- `/medrxiv_search`
- `/ncbi_bookshelf_search`
- `/health_topics_search`

## Environment Variables & Secrets

### Add Secrets (if needed for API keys)

```bash
# Store sensitive API keys in Wrangler secrets
wrangler secret put PUBMED_API_KEY
wrangler secret put FDA_API_KEY
```

These are injected into the `env` parameter in your Worker and are never exposed to the client.

## Architecture Benefits

### 1. **Instant Startup**
- V8 isolates start in milliseconds
- No cold start delays like traditional serverless functions

### 2. **Global Distribution**
- Workers run on Cloudflare's global network
- Lower latency for API calls to external healthcare services

### 3. **Security**
- API keys stay in Worker bindings, never exposed
- Each request runs in an isolated sandbox
- No access to filesystem or other isolates

### 4. **No Container Overhead**
- Lightweight execution compared to containers
- Per-request isolation without VM startup costs

### 5. **External API Access**
- All external API calls (FDA, PubMed, ClinicalTrials.gov) work natively via `fetch()`
- No firewall or network restrictions

## Scaling & Limits

- **Requests**: Unlimited (within plan limits)
- **CPU Time**: 50ms per request (CPU time)
- **Memory**: 128 MB per isolate
- **Request Size**: 100 MB
- **Response Size**: 100 MB

## Monitoring & Logs

### View Real-Time Logs

```bash
wrangler tail
```

### Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to Workers > healthcare-mcp-server
3. View metrics, logs, and deployments

## Next Steps

### For MCP Integration

To use this with Claude Desktop or other MCP clients:

1. Configure your client to point to your Worker URL
2. The Worker exposes tools that clients can discover and call
3. Results are returned as JSON responses

### Caching (Optional)

For improved performance, enable Cloudflare KV caching:

```jsonc
// Add to wrangler.jsonc
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

Then in `src/index.ts`:

```typescript
// Cache responses
const cacheKey = `pubmed:${query}`;
const cached = await env.CACHE?.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### Custom Domain

To use a custom domain instead of `*.workers.dev`:

1. Add your domain to Cloudflare
2. Update `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "api.yourdomain.com",
      "custom_domain": true
    }
  ]
}
```

## Troubleshooting

### "Cannot find module 'cloudflare:workers'"

This error means TypeScript types aren't installed. Run:

```bash
npm install --save-dev @cloudflare/workers-types typescript
```

### Worker Timeout

If requests exceed 50ms CPU time:
- Simplify your tool logic
- Cache expensive API responses
- Use KV for persistent caching

### 502 Bad Gateway

Check logs with `wrangler tail` to see the actual error.

## Rollback

To revert to a previous deployment:

```bash
# View deployment history
wrangler deployments list

# Rollback to specific deployment
wrangler rollback --deployment-id <id>
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)

## Summary

You now have a fully functional Healthcare MCP Server running on Cloudflare Workers with:

✅ 3 minimal configuration files  
✅ 8 healthcare tools available via HTTP  
✅ Global distribution across Cloudflare's network  
✅ Instant startup times (no cold starts)  
✅ Built-in security and isolation  
✅ Easy deployment and rollback  

Deploy with `npm run deploy` and your healthcare tools are live! 🚀

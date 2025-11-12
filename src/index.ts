/**
 * Healthcare MCP Server running on Cloudflare Workers
 * 
 * This Worker exposes healthcare tools via HTTP endpoints that can be
 * called by MCP clients (Claude Desktop, Cline, etc.)
 */
export interface Env {
  CACHE?: any; // KVNamespace
  PUBMED_API_KEY?: string;
  FDA_API_KEY?: string;
  CACHE_TTL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handler = new HealthcareMCP(env);
    return handler.fetch(request);
  },
  async scheduled(event: any, env: Env): Promise<void> {
    // Optional: Handle scheduled events
  }
};

class HealthcareMCP {
  env: Env;

  constructor(env: Env) {
    this.env = env;
  }
  /**
   * Search FDA drug information
   * @param drug_name - Name of the drug to search
   * @param search_type - Type: 'general', 'label', or 'adverse_events'
   */
  async fda_drug_lookup(drug_name: string, search_type: string = 'general') {
    const baseUrl = 'https://api.fda.gov/drug/event.json';
    const params = new URLSearchParams({
      search: `patient.drug.generic_name:"${drug_name}"`,
      limit: '10'
    });

    try {
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { 'User-Agent': 'healthcare-mcp/1.0' }
      });

      if (!response.ok) {
        return {
          status: 'error',
          error_message: `FDA API returned ${response.status}`
        };
      }

      const data = (await response.json()) as any;
      return {
        status: 'success',
        drug_name,
        search_type,
        results: data.results?.slice(0, 5) || [],
        total_records: data.meta?.results?.total || 0
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search PubMed medical literature
   * @param query - Search query
   * @param max_results - Maximum results (default: 5)
   */
  async pubmed_search(query: string, max_results: number = 5) {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const params = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: Math.min(max_results, 20).toString(),
      rettype: 'json'
    });

    try {
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { 'User-Agent': 'healthcare-mcp/1.0' }
      });

      if (!response.ok) {
        return {
          status: 'error',
          error_message: `PubMed API returned ${response.status}`
        };
      }

      const data = (await response.json()) as any;
      return {
        status: 'success',
        query,
        total_results: data.esearchresult?.count || 0,
        pubmed_ids: data.esearchresult?.idlist || []
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search clinical trials
   * @param condition - Medical condition
   * @param status - Trial status ('recruiting', 'active', 'completed', etc.)
   */
  async clinical_trials_search(
    condition: string,
    status: string = 'recruiting'
  ) {
    const baseUrl = 'https://clinicaltrials.gov/api/v2/studies';
    const params = new URLSearchParams({
      query: condition,
      filter: `status:${status}`,
      pageSize: '10',
      sortType: 'LastUpdatePostDate'
    });

    try {
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { 'User-Agent': 'healthcare-mcp/1.0' }
      });

      if (!response.ok) {
        return {
          status: 'error',
          error_message: `ClinicalTrials.gov API returned ${response.status}`
        };
      }

      const data = await response.json() as any;
      return {
        status: 'success',
        condition,
        trial_status: status,
        total_studies: data.totalCount || 0,
        studies: (data.studies || []).slice(0, 5).map((study: any) => ({
          nct_id: study.protocolSection?.identificationModule?.nctId,
          title: study.protocolSection?.identificationModule?.officialTitle,
          status: study.protocolSection?.statusModule?.overallStatus
        }))
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Look up ICD-10 diagnosis codes
   * @param code - ICD-10 code (optional)
   * @param description - Condition description (optional)
   */
  async lookup_icd_code(code?: string, description?: string) {
    // Using a simple mapping approach - in production, use a full ICD-10 database
    const icdDatabase: Record<string, string> = {
      'E11': 'Type 2 diabetes mellitus',
      'I10': 'Essential hypertension',
      'J45': 'Asthma',
      'M79.3': 'Panniculitis, unspecified',
      'E78.0': 'Pure hypercholesterolemia'
    };

    try {
      if (code && icdDatabase[code]) {
        return {
          status: 'success',
          code,
          description: icdDatabase[code]
        };
      }

      if (description) {
        const matches = Object.entries(icdDatabase).filter(([_, desc]) =>
          desc.toLowerCase().includes(description.toLowerCase())
        );

        return {
          status: 'success',
          query: description,
          matches: Object.fromEntries(matches)
        };
      }

      return {
        status: 'error',
        error_message: 'Provide either a code or description'
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate BMI
   * @param height_meters - Height in meters
   * @param weight_kg - Weight in kilograms
   */
  async calculate_bmi(height_meters: number, weight_kg: number) {
    try {
      if (height_meters <= 0 || weight_kg <= 0) {
        return {
          status: 'error',
          error_message: 'Height and weight must be positive numbers'
        };
      }

      const bmi = weight_kg / (height_meters * height_meters);
      let category = 'Normal';

      if (bmi < 18.5) {
        category = 'Underweight';
      } else if (bmi < 25) {
        category = 'Normal';
      } else if (bmi < 30) {
        category = 'Overweight';
      } else {
        category = 'Obese';
      }

      return {
        status: 'success',
        bmi: parseFloat(bmi.toFixed(2)),
        category,
        height_meters,
        weight_kg
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search MedRxiv preprints
   * @param query - Search query
   * @param sort_by - Sort field (default: 'rel')
   */
  async medrxiv_search(query: string, sort_by: string = 'rel') {
    const baseUrl = 'https://www.medrxiv.org/api/v1/articles';
    const params = new URLSearchParams({
      search: query,
      sort: sort_by,
      format: 'json',
      limit: '10'
    });

    try {
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { 'User-Agent': 'healthcare-mcp/1.0' }
      });

      if (!response.ok) {
        return {
          status: 'error',
          error_message: `MedRxiv API returned ${response.status}`
        };
      }

      const data = await response.json() as any;
      return {
        status: 'success',
        query,
        total_results: data.total_results || 0,
        preprints: (data.collection || []).slice(0, 5).map((article: any) => ({
          title: article.title,
          authors: article.authors,
          date: article.date,
          abstract: article.abstract?.substring(0, 200)
        }))
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search NCBI Bookshelf medical resources
   * @param query - Search query
   */
  async ncbi_bookshelf_search(query: string) {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const params = new URLSearchParams({
      db: 'books',
      term: query,
      retmax: '10',
      rettype: 'json'
    });

    try {
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { 'User-Agent': 'healthcare-mcp/1.0' }
      });

      if (!response.ok) {
        return {
          status: 'error',
          error_message: `NCBI Bookshelf API returned ${response.status}`
        };
      }

      const data = (await response.json()) as any;
      return {
        status: 'success',
        query,
        total_results: data.esearchresult?.count || 0,
        book_ids: data.esearchresult?.idlist || []
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get health topics from NIH
   * @param topic - Health topic to search
   */
  async health_topics_search(topic: string) {
    const baseUrl = 'https://health.nih.gov/health-topics';
    const params = new URLSearchParams({
      search: topic
    });

    try {
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { 'User-Agent': 'healthcare-mcp/1.0' }
      });

      if (!response.ok) {
        return {
          status: 'error',
          error_message: `NIH Health Topics API returned ${response.status}`
        };
      }

      const text = await response.text();
      return {
        status: 'success',
        topic,
        content: text.substring(0, 500)
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle HTTP requests to the Worker
   * Routes calls to appropriate tool methods
   */
  fetch(request: Request): Promise<Response> {
    return this._handleRequest(request);
  }

  async _handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method !== 'POST' && request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      let result: any;

      if (pathname === '/fda_drug_lookup' && request.method === 'POST') {
        const body = await request.json() as any;
        result = await this.fda_drug_lookup(body.drug_name, body.search_type);
      } else if (pathname === '/pubmed_search' && request.method === 'POST') {
        const body = await request.json() as any;
        result = await this.pubmed_search(body.query, body.max_results);
      } else if (pathname === '/clinical_trials_search' && request.method === 'POST') {
        const body = await request.json() as any;
        result = await this.clinical_trials_search(body.condition, body.status);
      } else if (pathname === '/lookup_icd_code' && request.method === 'POST') {
        const body = await request.json() as any;
        result = await this.lookup_icd_code(body.code, body.description);
      } else if (pathname === '/calculate_bmi' && request.method === 'POST') {
        const body = await request.json() as any;
        result = await this.calculate_bmi(body.height_meters, body.weight_kg);
      } else if (pathname === '/medrxiv_search' && request.method === 'POST') {
        const body = await request.json() as any;
        result = await this.medrxiv_search(body.query, body.sort_by);
      } else if (pathname === '/ncbi_bookshelf_search' && request.method === 'POST') {
        const body = await request.json() as any;
        result = await this.ncbi_bookshelf_search(body.query);
      } else if (pathname === '/health_topics_search' && request.method === 'POST') {
        const body = await request.json() as any;
        result = await this.health_topics_search(body.topic);
      } else if (pathname === '/' && request.method === 'GET') {
        result = {
          status: 'ok',
          message: 'Healthcare MCP Server on Cloudflare Workers',
          version: '1.0.0',
          tools: [
            'fda_drug_lookup',
            'pubmed_search',
            'clinical_trials_search',
            'lookup_icd_code',
            'calculate_bmi',
            'medrxiv_search',
            'ncbi_bookshelf_search',
            'health_topics_search'
          ]
        };
      } else {
        return new Response('Not found', { status: 404 });
      }

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}

#!/usr/bin/env node

/**
 * HTTP MCP Bridge for Healthcare MCP Server
 *
 * This bridge allows MCP clients to communicate with the Healthcare MCP Server
 * running on Cloudflare Workers via standard MCP protocol over stdio.
 */

const { spawn } = require('child_process');
const readline = require('readline');

class HTTPMCPBridge {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || process.env.HEALTHCARE_MCP_URL || 'https://healthcare-mcp-server.pierretokns.workers.dev';
    this.requestId = 1;
    this.pendingRequests = new Map();
  }

  async callTool(toolName, arguments) {
    const response = await fetch(`${this.baseUrl}/${toolName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(arguments)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async initialize() {
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "healthcare-mcp-http-bridge",
        version: "1.0.0"
      }
    };
  }

  async listTools() {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const data = await response.json();

      return {
        tools: data.tools.map(toolName => ({
          name: toolName,
          description: this.getToolDescription(toolName),
          inputSchema: this.getToolSchema(toolName)
        }))
      };
    } catch (error) {
      console.error('Failed to fetch tools list:', error);
      return { tools: [] };
    }
  }

  getToolDescription(toolName) {
    const descriptions = {
      'fda_drug_lookup': 'Search FDA drug information database',
      'pubmed_search': 'Search PubMed medical literature database',
      'clinical_trials_search': 'Search clinical trials database',
      'lookup_icd_code': 'Look up ICD-10 medical diagnosis codes',
      'calculate_bmi': 'Calculate Body Mass Index (BMI)',
      'medrxiv_search': 'Search MedRxiv preprint articles',
      'ncbi_bookshelf_search': 'Search NCBI Bookshelf medical resources',
      'health_topics_search': 'Search NIH health topics database'
    };
    return descriptions[toolName] || `Healthcare tool: ${toolName}`;
  }

  getToolSchema(toolName) {
    const schemas = {
      'fda_drug_lookup': {
        type: "object",
        properties: {
          drug_name: { type: "string", description: "Name of the drug to search" },
          search_type: {
            type: "string",
            enum: ["general", "label", "adverse_events"],
            default: "general",
            description: "Type of drug information to retrieve"
          }
        },
        required: ["drug_name"]
      },
      'pubmed_search': {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for medical literature" },
          max_results: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            default: 5,
            description: "Maximum number of results to return"
          }
        },
        required: ["query"]
      },
      'clinical_trials_search': {
        type: "object",
        properties: {
          condition: { type: "string", description: "Medical condition to search for" },
          status: {
            type: "string",
            enum: ["recruiting", "active", "completed", "suspended", "terminated", "withdrawn", "all"],
            default: "recruiting",
            description: "Trial status filter"
          }
        },
        required: ["condition"]
      },
      'lookup_icd_code': {
        type: "object",
        properties: {
          code: { type: "string", description: "ICD-10 code to look up" },
          description: { type: "string", description: "Medical condition description to search for" }
        },
        anyOf: [
          { required: ["code"] },
          { required: ["description"] }
        ]
      },
      'calculate_bmi': {
        type: "object",
        properties: {
          height_meters: {
            type: "number",
            minimum: 0.5,
            maximum: 3.0,
            description: "Height in meters"
          },
          weight_kg: {
            type: "number",
            minimum: 1,
            maximum: 500,
            description: "Weight in kilograms"
          }
        },
        required: ["height_meters", "weight_kg"]
      },
      'medrxiv_search': {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for MedRxiv articles" },
          sort_by: {
            type: "string",
            enum: ["rel", "date", "views"],
            default: "rel",
            description: "Sort order for results"
          }
        },
        required: ["query"]
      },
      'ncbi_bookshelf_search': {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for NCBI Bookshelf" }
        },
        required: ["query"]
      },
      'health_topics_search': {
        type: "object",
        properties: {
          topic: { type: "string", description: "Health topic to search for" }
        },
        required: ["topic"]
      }
    };
    return schemas[toolName] || { type: "object", properties: {} };
  }

  async call MCPTool(name, arguments) {
    try {
      const result = await this.callTool(name, arguments);

      if (result.status === 'error') {
        return {
          content: [{
            type: "text",
            text: `Error: ${result.error_message}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error calling tool ${name}: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async handleRequest(request) {
    const { jsonrpc, id, method, params } = request;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: "2.0",
          id,
          result: await this.initialize()
        };

      case 'tools/list':
        return {
          jsonrpc: "2.0",
          id,
          result: await this.listTools()
        };

      case 'tools/call':
        return {
          jsonrpc: "2.0",
          id,
          result: await this.callMCPTool(params.name, params.arguments)
        };

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: "Method not found"
          }
        };
    }
  }
}

// MCP Server implementation
class MCPServer {
  constructor() {
    this.bridge = new HTTPMCPBridge();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  async start() {
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.bridge.handleRequest(request);
        console.log(JSON.stringify(response));
      } catch (error) {
        const errorResponse = {
          jsonrpc: "2.0",
          id: request.id || null,
          error: {
            code: -32700,
            message: "Parse error",
            data: error.message
          }
        };
        console.log(JSON.stringify(errorResponse));
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      this.rl.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.rl.close();
      process.exit(0);
    });
  }
}

// Start the MCP server
if (require.main === module) {
  const server = new MCPServer();
  server.start().catch(console.error);
}

module.exports = { HTTPMCPBridge, MCPServer };
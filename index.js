#!/usr/bin/env node

/**
 * z.ai MCP Server
 * 
 * A Model Context Protocol (MCP) server that integrates with z.ai API.
 * Provides tools for chat completion, search, and summarization.
 * 
 * @author Richard Hewitt
 * @license MIT
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Configuration for z.ai API
 */
const ZAI_CONFIG = {
  apiKey: process.env.ZAI_API_KEY,
  baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai',
  model: process.env.ZAI_MODEL || 'claude-3-sonnet-20240229',
  maxTokens: parseInt(process.env.ZAI_MAX_TOKENS || '4000', 10),
  temperature: parseFloat(process.env.ZAI_TEMPERATURE || '0.7'),
};

/**
 * Validates that required configuration is present
 * @throws {Error} If required configuration is missing
 */
function validateConfig() {
  if (!ZAI_CONFIG.apiKey) {
    throw new Error('ZAI_API_KEY environment variable is required');
  }
}

/**
 * Makes an authenticated request to the z.ai API
 * 
 * @param {string} endpoint - API endpoint path
 * @param {object} data - Request payload
 * @returns {Promise<any>} API response
 * @throws {Error} If the API request fails
 */
async function zaiApiRequest(endpoint, data) {
  const url = `${ZAI_CONFIG.baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAI_CONFIG.apiKey}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`z.ai API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('z.ai API error')) {
      throw error;
    }
    throw new Error(`Failed to connect to z.ai API: ${error.message}`);
  }
}

/**
 * Creates and configures the MCP server
 * @returns {Server} Configured MCP server instance
 */
export function createMCPServer() {
  validateConfig();

  const server = new Server(
    {
      name: 'zai-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Handler for listing available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'zai_chat',
          description: 'Send a message to z.ai chat API and receive a response. Supports multi-turn conversations with context.',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The message to send to z.ai',
              },
              system: {
                type: 'string',
                description: 'Optional system prompt to set context or behavior',
              },
              conversationHistory: {
                type: 'array',
                description: 'Optional conversation history for context',
                items: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['user', 'assistant'],
                    },
                    content: {
                      type: 'string',
                    },
                  },
                },
              },
              temperature: {
                type: 'number',
                description: 'Optional temperature (0.0-1.0) for response randomness',
                minimum: 0,
                maximum: 1,
              },
              maxTokens: {
                type: 'number',
                description: 'Optional maximum tokens for the response',
                minimum: 1,
              },
            },
            required: ['message'],
          },
        },
        {
          name: 'zai_search',
          description: 'Search using z.ai search capabilities. Retrieves relevant information from the web or knowledge base.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)',
                minimum: 1,
                maximum: 50,
              },
              filters: {
                type: 'object',
                description: 'Optional filters for the search (e.g., date range, domain)',
                properties: {
                  dateRange: {
                    type: 'string',
                    description: 'Date range filter (e.g., "last_week", "last_month")',
                  },
                  domains: {
                    type: 'array',
                    description: 'Specific domains to search within',
                    items: {
                      type: 'string',
                    },
                  },
                },
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'zai_summarize',
          description: 'Summarize text using z.ai. Condenses long content into concise summaries.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to summarize',
              },
              length: {
                type: 'string',
                description: 'Desired summary length',
                enum: ['short', 'medium', 'long'],
              },
              style: {
                type: 'string',
                description: 'Summary style',
                enum: ['bullet_points', 'paragraph', 'key_points'],
              },
            },
            required: ['text'],
          },
        },
      ],
    };
  });

  /**
   * Handler for tool execution
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'zai_chat': {
          const messages = [];
          
          // Add system message if provided
          if (args.system) {
            messages.push({
              role: 'system',
              content: args.system,
            });
          }

          // Add conversation history if provided
          if (args.conversationHistory && Array.isArray(args.conversationHistory)) {
            messages.push(...args.conversationHistory);
          }

          // Add current message
          messages.push({
            role: 'user',
            content: args.message,
          });

          const response = await zaiApiRequest('/v1/chat/completions', {
            model: ZAI_CONFIG.model,
            messages,
            max_tokens: args.maxTokens || ZAI_CONFIG.maxTokens,
            temperature: args.temperature ?? ZAI_CONFIG.temperature,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  response: response.choices[0].message.content,
                  usage: response.usage,
                  model: response.model,
                }, null, 2),
              },
            ],
          };
        }

        case 'zai_search': {
          const searchData = {
            query: args.query,
            max_results: args.maxResults || 10,
          };

          if (args.filters) {
            searchData.filters = args.filters;
          }

          const response = await zaiApiRequest('/v1/search', searchData);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  results: response.results,
                  count: response.results?.length || 0,
                  query: args.query,
                }, null, 2),
              },
            ],
          };
        }

        case 'zai_summarize': {
          const summarizeData = {
            text: args.text,
            length: args.length || 'medium',
            style: args.style || 'paragraph',
          };

          const response = await zaiApiRequest('/v1/summarize', summarizeData);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  summary: response.summary,
                  original_length: args.text.length,
                  summary_length: response.summary?.length || 0,
                }, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main entry point for running the server via stdio
 */
async function main() {
  try {
    const server = createMCPServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('z.ai MCP Server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Run the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

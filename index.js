#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Z.AI API Configuration
 * @constant {string} ZAI_API_KEY - API key from environment variables
 * @constant {string} ZAI_API_BASE - Base URL for z.ai API
 */
const ZAI_API_KEY = process.env.ZAI_API_KEY;
const ZAI_API_BASE = process.env.ZAI_API_BASE || 'https://api.z.ai/v1';

/**
 * Validates that required environment variables are set
 * @throws {Error} If ZAI_API_KEY is not configured
 */
function validateEnvironment() {
  if (!ZAI_API_KEY) {
    throw new Error('ZAI_API_KEY environment variable is required');
  }
}

/**
 * Makes an authenticated request to the z.ai API
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response data
 * @throws {Error} If the API request fails
 */
async function makeZaiRequest(endpoint, options = {}) {
  const url = `${ZAI_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZAI_API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Z.AI API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Sends a chat message to z.ai and returns the response
 * @param {string} message - The user's message
 * @param {Array<Object>} [history] - Optional conversation history
 * @param {Object} [options] - Additional options (temperature, max_tokens, etc.)
 * @returns {Promise<Object>} Chat completion response
 */
async function zaiChat(message, history = [], options = {}) {
  const messages = [
    ...history,
    { role: 'user', content: message }
  ];

  const payload = {
    messages,
    temperature: options.temperature || 0.7,
    max_tokens: options.max_tokens || 2000,
    ...options,
  };

  return await makeZaiRequest('/chat/completions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Performs a search using z.ai's search capabilities
 * @param {string} query - Search query
 * @param {Object} [options] - Search options (max_results, filter, etc.)
 * @returns {Promise<Object>} Search results
 */
async function zaiSearch(query, options = {}) {
  const payload = {
    query,
    max_results: options.max_results || 10,
    ...options,
  };

  return await makeZaiRequest('/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Summarizes text using z.ai
 * @param {string} text - Text to summarize
 * @param {Object} [options] - Summarization options (length, style, etc.)
 * @returns {Promise<Object>} Summarization result
 */
async function zaiSummarize(text, options = {}) {
  const payload = {
    text,
    length: options.length || 'medium',
    style: options.style || 'concise',
    ...options,
  };

  return await makeZaiRequest('/summarize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Creates and configures the MCP server
 * @returns {Server} Configured MCP server instance
 */
function createServer() {
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
          description: 'Send a message to z.ai chat API and get a response. Supports conversation history and various options.',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The message to send to z.ai',
              },
              history: {
                type: 'array',
                description: 'Optional conversation history as array of {role, content} objects',
                items: {
                  type: 'object',
                  properties: {
                    role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                    content: { type: 'string' },
                  },
                  required: ['role', 'content'],
                },
              },
              temperature: {
                type: 'number',
                description: 'Sampling temperature (0.0 to 2.0). Higher values make output more random.',
                minimum: 0,
                maximum: 2,
              },
              max_tokens: {
                type: 'number',
                description: 'Maximum number of tokens to generate',
              },
            },
            required: ['message'],
          },
        },
        {
          name: 'zai_search',
          description: 'Search using z.ai search capabilities. Returns relevant results based on the query.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              max_results: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)',
                minimum: 1,
                maximum: 100,
              },
              filter: {
                type: 'object',
                description: 'Optional filters to apply to search results',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'zai_summarize',
          description: 'Summarize text using z.ai. Supports different summary lengths and styles.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text to summarize',
              },
              length: {
                type: 'string',
                description: 'Summary length: short, medium, or long (default: medium)',
                enum: ['short', 'medium', 'long'],
              },
              style: {
                type: 'string',
                description: 'Summary style: concise, detailed, or bullet-points (default: concise)',
                enum: ['concise', 'detailed', 'bullet-points'],
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
    try {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'zai_chat': {
          const result = await zaiChat(
            args.message,
            args.history || [],
            {
              temperature: args.temperature,
              max_tokens: args.max_tokens,
            }
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'zai_search': {
          const result = await zaiSearch(args.query, {
            max_results: args.max_results,
            filter: args.filter,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'zai_summarize': {
          const result = await zaiSummarize(args.text, {
            length: args.length,
            style: args.style,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
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
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main function to start the MCP server
 */
async function main() {
  try {
    validateEnvironment();

    const server = createServer();
    const transport = new StdioServerTransport();

    await server.connect(transport);

    console.error('Z.AI MCP Server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main();

// Export for Netlify functions
export { createServer, zaiChat, zaiSearch, zaiSummarize, makeZaiRequest };
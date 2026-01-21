#!/usr/bin/env node

/**
 * z.ai MCP Server
 * 
 * A Model Context Protocol server that integrates with z.ai API,
 * providing chat completion, search, and summarization capabilities.
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
 * Configuration from environment variables
 */
const CONFIG = {
  apiKey: process.env.ZAI_API_KEY,
  baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai',
  model: process.env.ZAI_MODEL || 'claude-3-sonnet-20240229',
  maxTokens: parseInt(process.env.ZAI_MAX_TOKENS || '4000', 10),
  temperature: parseFloat(process.env.ZAI_TEMPERATURE || '0.7'),
};

/**
 * Validates that required configuration is present
 * @throws {Error} If API key is missing
 */
function validateConfig() {
  if (!CONFIG.apiKey) {
    throw new Error('ZAI_API_KEY environment variable is required');
  }
}

/**
 * Makes an authenticated request to z.ai API
 * 
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request payload
 * @returns {Promise<Object>} API response
 * @throws {Error} If API request fails
 */
async function makeZaiRequest(endpoint, data) {
  const url = `${CONFIG.baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'User-Agent': 'zai-mcp-server/1.0.0',
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
 * 
 * @returns {Server} Configured MCP server instance
 */
export function createMCPServer() {
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
          description: 'Send messages to z.ai chat API for AI-powered responses. Supports multi-turn conversations with context.',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The message to send to z.ai chat',
              },
              system_prompt: {
                type: 'string',
                description: 'Optional system prompt to set context for the conversation',
              },
              max_tokens: {
                type: 'number',
                description: 'Maximum tokens in the response (default: 4000)',
              },
              temperature: {
                type: 'number',
                description: 'Sampling temperature 0-1 (default: 0.7)',
              },
            },
            required: ['message'],
          },
        },
        {
          name: 'zai_search',
          description: 'Search using z.ai search capabilities. Performs semantic search across indexed content.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query string',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)',
              },
              filters: {
                type: 'object',
                description: 'Optional filters to apply to search results',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'zai_summarize',
          description: 'Summarize text using z.ai. Creates concise summaries of long-form content.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text to summarize',
              },
              length: {
                type: 'string',
                enum: ['short', 'medium', 'long'],
                description: 'Desired summary length (default: medium)',
              },
              style: {
                type: 'string',
                enum: ['bullets', 'paragraph', 'technical'],
                description: 'Summary style format (default: paragraph)',
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
      validateConfig();

      const { name, arguments: args } = request.params;

      switch (name) {
        case 'zai_chat': {
          const { message, system_prompt, max_tokens, temperature } = args;
          
          const messages = [
            ...(system_prompt ? [{ role: 'system', content: system_prompt }] : []),
            { role: 'user', content: message },
          ];

          const response = await makeZaiRequest('/v1/chat/completions', {
            model: CONFIG.model,
            messages,
            max_tokens: max_tokens || CONFIG.maxTokens,
            temperature: temperature !== undefined ? temperature : CONFIG.temperature,
          });

          return {
            content: [
              {
                type: 'text',
                text: response.choices?.[0]?.message?.content || 'No response from z.ai',
              },
            ],
          };
        }

        case 'zai_search': {
          const { query, limit = 10, filters = {} } = args;

          const response = await makeZaiRequest('/v1/search', {
            query,
            limit,
            filters,
          });

          const results = response.results || [];
          const formattedResults = results
            .map((result, index) => 
              `${index + 1}. ${result.title || 'Untitled'}\n` +
              `   ${result.snippet || result.content || ''}\n` +
              `   URL: ${result.url || 'N/A'}\n`
            )
            .join('\n');

          return {
            content: [
              {
                type: 'text',
                text: formattedResults || 'No results found',
              },
            ],
          };
        }

        case 'zai_summarize': {
          const { text, length = 'medium', style = 'paragraph' } = args;

          const systemPrompt = `You are a summarization assistant. Create a ${length} summary in ${style} format.`;
          const userPrompt = `Please summarize the following text:\n\n${text}`;

          const response = await makeZaiRequest('/v1/chat/completions', {
            model: CONFIG.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: CONFIG.maxTokens,
            temperature: 0.5,
          });

          return {
            content: [
              {
                type: 'text',
                text: response.choices?.[0]?.message?.content || 'Failed to generate summary',
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
    validateConfig();
    
    const server = createMCPServer();
    const transport = new StdioServerTransport();
    
    await server.connect(transport);
    
    console.error('z.ai MCP Server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

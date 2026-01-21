#!/usr/bin/env node

/**
 * @fileoverview MCP Server for z.ai API Integration
 * @description Production-ready MCP server that integrates with z.ai API for chat, search, and summarization capabilities.
 * @author Richard Hewitt
 * @license MIT
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Configuration for z.ai API
 * @typedef {Object} ZaiConfig
 * @property {string} apiKey - z.ai API key
 * @property {string} baseUrl - Base URL for z.ai API
 */
const ZAI_CONFIG = {
  apiKey: process.env.ZAI_API_KEY || "",
  baseUrl: process.env.ZAI_BASE_URL || "https://api.z.ai/v1",
};

/**
 * Validates that required environment variables are set
 * @throws {Error} If required environment variables are missing
 */
function validateConfig() {
  if (!ZAI_CONFIG.apiKey) {
    throw new Error(
      "ZAI_API_KEY environment variable is required. Please set it in your .env file or environment."
    );
  }
}

/**
 * Makes an authenticated request to the z.ai API
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 * @throws {Error} If the API request fails
 */
async function makeZaiRequest(endpoint, options = {}) {
  const url = `${ZAI_CONFIG.baseUrl}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ZAI_CONFIG.apiKey}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `z.ai API error (${response.status}): ${errorBody || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes("z.ai API error")) {
      throw error;
    }
    throw new Error(`Failed to connect to z.ai API: ${error.message}`);
  }
}

/**
 * Tool: Send a message to z.ai chat API
 * @param {string} message - The message to send
 * @param {string} [conversationId] - Optional conversation ID to continue a chat
 * @param {Object} [options] - Additional chat options
 * @returns {Promise<Object>} Chat response from z.ai
 */
async function zaiChat(message, conversationId = null, options = {}) {
  const payload = {
    message,
    ...(conversationId && { conversation_id: conversationId }),
    ...options,
  };

  return await makeZaiRequest("/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Tool: Search using z.ai search capabilities
 * @param {string} query - Search query
 * @param {Object} [options] - Search options (filters, limit, etc.)
 * @returns {Promise<Object>} Search results from z.ai
 */
async function zaiSearch(query, options = {}) {
  const payload = {
    query,
    ...options,
  };

  return await makeZaiRequest("/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Tool: Summarize text using z.ai
 * @param {string} text - Text to summarize
 * @param {Object} [options] - Summarization options (length, style, etc.)
 * @returns {Promise<Object>} Summary from z.ai
 */
async function zaiSummarize(text, options = {}) {
  const payload = {
    text,
    ...options,
  };

  return await makeZaiRequest("/summarize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Creates and configures the MCP server
 * @returns {Server} Configured MCP server instance
 */
export function createMCPServer() {
  const server = new Server(
    {
      name: "zai-mcp-server",
      version: "1.0.0",
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
          name: "zai_chat",
          description:
            "Send a message to z.ai chat API and get a conversational response. Supports context through conversation IDs.",
          inputSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The message to send to z.ai chat",
              },
              conversationId: {
                type: "string",
                description:
                  "Optional conversation ID to continue an existing conversation",
              },
              temperature: {
                type: "number",
                description:
                  "Optional temperature for response randomness (0.0-1.0)",
                minimum: 0,
                maximum: 1,
              },
              maxTokens: {
                type: "number",
                description: "Optional maximum tokens for the response",
              },
            },
            required: ["message"],
          },
        },
        {
          name: "zai_search",
          description:
            "Search using z.ai's powerful search capabilities. Returns relevant results based on your query.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query",
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 10,
              },
              filters: {
                type: "object",
                description:
                  "Optional filters to narrow down search results (e.g., date, category)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "zai_summarize",
          description:
            "Summarize text using z.ai's summarization capabilities. Supports different summary lengths and styles.",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The text to summarize",
              },
              length: {
                type: "string",
                enum: ["short", "medium", "long"],
                description: "Desired summary length",
                default: "medium",
              },
              style: {
                type: "string",
                enum: ["bullet", "paragraph", "key_points"],
                description: "Summary style format",
                default: "paragraph",
              },
            },
            required: ["text"],
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
        case "zai_chat": {
          const { message, conversationId, temperature, maxTokens } = args;
          const options = {};
          
          if (temperature !== undefined) options.temperature = temperature;
          if (maxTokens !== undefined) options.max_tokens = maxTokens;

          const result = await zaiChat(message, conversationId, options);
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "zai_search": {
          const { query, limit, filters } = args;
          const options = {};
          
          if (limit !== undefined) options.limit = limit;
          if (filters !== undefined) options.filters = filters;

          const result = await zaiSearch(query, options);
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "zai_summarize": {
          const { text, length, style } = args;
          const options = {};
          
          if (length !== undefined) options.length = length;
          if (style !== undefined) options.style = style;

          const result = await zaiSummarize(text, options);
          
          return {
            content: [
              {
                type: "text",
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
            type: "text",
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
 * Main function to start the MCP server
 */
async function main() {
  try {
    // Validate configuration
    validateConfig();

    // Create and start the server
    const server = createMCPServer();
    const transport = new StdioServerTransport();
    
    await server.connect(transport);
    
    console.error("z.ai MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

// Start the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

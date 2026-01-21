/**
 * Netlify Serverless Function for z.ai MCP Server
 * 
 * This function wraps the MCP server for deployment on Netlify,
 * enabling server-side execution of z.ai API requests.
 */

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMCPServer } from '../../index.js';

/**
 * Netlify function handler
 * 
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Promise<Object>} HTTP response
 */
export const handler = async (event, context) => {
  try {
    // Create MCP server instance
    const server = createMCPServer();
    
    // Create SSE transport for HTTP requests
    const transport = new SSEServerTransport('/mcp', server);
    
    // Handle the request
    return await transport.handleRequest(event, context);
  } catch (error) {
    console.error('MCP function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

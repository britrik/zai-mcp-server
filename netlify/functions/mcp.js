import { createHash, timingSafeEqual } from 'node:crypto';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMCPServer } from '../../index.js';

export const config = { path: '/mcp' };

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
  'Cache-Control': 'no-store',
};

function errorResponse(status, message, extraHeaders = {}) {
  return Response.json({
    jsonrpc: '2.0',
    id: null,
    error: { code: -32000, message },
  }, { status, headers: { ...headers, ...extraHeaders } });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) {
    return errorResponse(500, 'Server configuration error: MCP_AUTH_TOKEN is required');
  }

  const authorization = req.headers.get('Authorization') || '';
  const digest = (value) => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${token}`))) {
    return errorResponse(401, 'Unauthorized', { 'WWW-Authenticate': 'Bearer' });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed', { Allow: 'POST, OPTIONS' });
  }

  const server = createMCPServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(req);
    const body = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);
    for (const [name, value] of Object.entries(headers)) {
      responseHeaders.set(name, value);
    }
    return new Response(response.status === 202 || response.status === 204 ? null : body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('MCP function error:', error);
    return errorResponse(500, 'Internal server error');
  } finally {
    await server.close();
  }
}

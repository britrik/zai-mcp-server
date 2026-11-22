import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import handler, { config } from './netlify/functions/mcp.js';

const token = 'local-test-token';

beforeEach((t) => {
  const originalToken = process.env.MCP_AUTH_TOKEN;
  const originalFlag = process.env.ZAI_DISABLE_CUSTOM_SEARCH;
  process.env.MCP_AUTH_TOKEN = token;
  delete process.env.ZAI_DISABLE_CUSTOM_SEARCH;
  t.after(() => {
    for (const [name, value] of [
      ['MCP_AUTH_TOKEN', originalToken],
      ['ZAI_DISABLE_CUSTOM_SEARCH', originalFlag],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
});

function request({ method = 'POST', authorization = `Bearer ${token}`, body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (authorization !== null) headers.Authorization = authorization;
  return new Request('https://example.netlify.app/mcp', {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body ?? {
      jsonrpc: '2.0', id: 1, method: 'tools/list',
    }) : undefined,
  });
}

test('Functions v2 config maps /mcp', () => {
  assert.equal(config.path, '/mcp');
});

test('unset token fails closed before serving tools', async () => {
  delete process.env.MCP_AUTH_TOKEN;
  const response = await handler(request());
  assert.equal(response.status, 500);
  assert.match((await response.json()).error.message, /MCP_AUTH_TOKEN is required/);
});

for (const authorization of [null, '', 'Bearer wrong', token, 'Basic local-test-token']) {
  test(`rejects missing or wrong bearer credentials: ${JSON.stringify(authorization)}`, async () => {
    const response = await handler(request({ authorization }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('WWW-Authenticate'), 'Bearer');
    assert.equal((await response.json()).error.message, 'Unauthorized');
  });
}

test('OPTIONS preflight works without credentials or server token', async () => {
  delete process.env.MCP_AUTH_TOKEN;
  const response = await handler(request({ method: 'OPTIONS', authorization: null }));
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(response.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
});

for (const method of ['GET', 'DELETE', 'PUT']) {
  test(`${method} returns a JSON-RPC 405`, async () => {
    const response = await handler(request({ method }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'POST, OPTIONS');
    const body = await response.json();
    assert.equal(body.jsonrpc, '2.0');
    assert.equal(body.id, null);
    assert.equal(typeof body.error.code, 'number');
  });
}

test('initialize succeeds without creating a session', async () => {
  const response = await handler(request({ body: {
    jsonrpc: '2.0', id: 7, method: 'initialize', params: {
      protocolVersion: '2025-03-26', capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' },
    },
  } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Mcp-Session-Id'), null);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const body = await response.json();
  assert.equal(body.id, 7);
  assert.equal(body.result.serverInfo.name, 'zai-mcp-server');
  assert.ok(body.result.capabilities.tools);
});

test('tools/list works independently with all three tools', async () => {
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Mcp-Session-Id'), null);
  assert.deepEqual((await response.json()).result.tools.map((tool) => tool.name), [
    'zai_chat', 'zai_search', 'zai_summarize',
  ]);
});

test('HTTP requests observe the current custom search flag', async () => {
  process.env.ZAI_DISABLE_CUSTOM_SEARCH = 'true';
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).result.tools.map((tool) => tool.name), [
    'zai_chat', 'zai_summarize',
  ]);
  const rejected = await handler(request({ body: {
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'zai_search', arguments: { query: 'public docs' } },
  } }));
  const result = (await rejected.json()).result;
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /official webSearchPrime/);
  delete process.env.ZAI_DISABLE_CUSTOM_SEARCH;
  const restored = await handler(request());
  assert.equal((await restored.json()).result.tools.length, 3);
});

test('malformed JSON receives a protocol error', async () => {
  const validRequest = request();
  const response = await handler(new Request(validRequest.url, {
    method: 'POST', headers: validRequest.headers, body: '{',
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, -32700);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createMCPServer } from './index.js';

async function request(t, flag, method, params = {}) {
  const original = process.env.ZAI_DISABLE_CUSTOM_SEARCH;
  if (flag === undefined) {
    delete process.env.ZAI_DISABLE_CUSTOM_SEARCH;
  } else {
    process.env.ZAI_DISABLE_CUSTOM_SEARCH = flag;
  }
  const server = createMCPServer();
  if (original === undefined) {
    delete process.env.ZAI_DISABLE_CUSTOM_SEARCH;
  } else {
    process.env.ZAI_DISABLE_CUSTOM_SEARCH = original;
  }
  t.after(() => server.close());
  let respond;
  const response = new Promise((resolve) => { respond = resolve; });
  const transport = {
    async start() {},
    async close() {},
    async send(message) { respond(message); },
  };
  await server.connect(transport);
  transport.onmessage({ jsonrpc: '2.0', id: 1, method, params });
  const message = await response;
  assert.equal(message.error, undefined);
  return message.result;
}

for (const flag of [undefined, '', 'false', 'TRUE', '1']) {
  test(`custom search remains listed with flag ${JSON.stringify(flag)}`, async (t) => {
    const result = await request(t, flag, 'tools/list');
    assert.deepEqual(result.tools.map((tool) => tool.name), [
      'zai_chat', 'zai_search', 'zai_summarize',
    ]);
  });
}

test('true hides only custom search', async (t) => {
  const result = await request(t, 'true', 'tools/list');
  assert.deepEqual(result.tools.map((tool) => tool.name), ['zai_chat', 'zai_summarize']);
});

test('true rejects stale custom search calls before API configuration or requests', async (t) => {
  const result = await request(t, 'true', 'tools/call', {
    name: 'zai_search', arguments: { query: 'public documentation' },
  });
  assert.equal(result.isError, true);
  assert.deepEqual(result.content, [{
    type: 'text',
    text: 'Error: Custom zai_search is disabled. Use the official webSearchPrime server instead.',
  }]);
});

test('true rejects custom search even with empty arguments', async (t) => {
  const result = await request(t, 'true', 'tools/call', { name: 'zai_search' });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /official webSearchPrime server/);
});

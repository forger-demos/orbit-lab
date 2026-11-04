import {expect, test} from 'bun:test';
import {handle} from './app';

test('health reports ok', async () => {
  const res = await handle(new Request('http://x/api/health'));
  expect(await res.json()).toEqual({ok: true});
});

test('serves the page', async () => {
  const res = await handle(new Request('http://x/'));
  expect(res.status).toBe(200);
});

test('refuses paths outside public', async () => {
  const res = await handle(new Request('http://x/../package.json'));
  expect(res.status).toBe(404);
});

test('serves the bundled page script', async () => {
  const res = await handle(new Request('http://x/main.js'));
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('javascript');
  expect(await res.text()).toContain('getElementById');
});

test('serves the plot worker as its own script', async () => {
  const res = await handle(new Request('http://x/porkchop-worker.js'));
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('javascript');
  expect(await res.text()).toContain('onmessage');
});

test('the page carries the explanation panel and its source list', async () => {
  const html = await (await handle(new Request('http://x/'))).text();
  expect(html).toContain('id="explain"');
  expect(html).toContain('id="explain-body"');
  expect(html).toContain('id="explain-sources"');
});

import {afterAll, expect, test} from 'bun:test';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from './build';
import {scripts} from './entries';

const out = await mkdtemp(join(tmpdir(), 'orbit-dist-'));
afterAll(() => rm(out, {recursive: true, force: true}));

test('build writes the page and every script it loads', async () => {
  await build(out);
  const html = await Bun.file(join(out, 'index.html')).text();
  const referenced = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]!);
  expect(referenced.length).toBeGreaterThan(0);
  for (const src of referenced) {
    expect(await Bun.file(join(out, src)).exists()).toBe(true);
  }
});

test('build writes each worker the app constructs', async () => {
  const source = await Bun.file(new URL('./web/main.ts', import.meta.url)).text();
  const workers = [...source.matchAll(/new Worker\('([^']+)'/g)].map((m) => m[1]!);
  expect(workers.length).toBeGreaterThan(0);
  for (const url of workers) {
    expect(await Bun.file(join(out, url)).exists()).toBe(true);
  }
});

test('build covers every entry point the dev server serves', async () => {
  for (const path of Object.keys(scripts)) {
    expect(await Bun.file(join(out, path)).exists()).toBe(true);
  }
});

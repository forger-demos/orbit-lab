import {expect, test} from 'bun:test';

const forger = 'https://github.com/diegoaltoworks/forger';

test('README credits forger directly under the first paragraph with both links', async () => {
  const readme = await Bun.file(new URL('../README.md', import.meta.url)).text();
  const lines = readme.split('\n');
  const credit = lines.findIndex((l) => l.startsWith('> Built with [forger]'));
  expect(credit).toBeGreaterThan(0);
  expect(lines[credit]).toContain(`(${forger})`);
  expect(lines[credit]).toContain(`(${forger}#readme)`);
  expect(lines[credit - 2]).toStartWith('See the solar system');
});

test('page footer credits forger with a link', async () => {
  const html = await Bun.file(new URL('../public/index.html', import.meta.url)).text();
  expect(html).toMatch(/<footer>[^]*Built with <a href="https:\/\/github\.com\/diegoaltoworks\/forger">forger<\/a>[^]*<\/footer>/);
});

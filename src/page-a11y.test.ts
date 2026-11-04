import {expect, test} from 'bun:test';

const tokens = await Bun.file(new URL('../public/tokens.css', import.meta.url)).text();
const html = await Bun.file(new URL('../public/index.html', import.meta.url)).text();

type Theme = Record<string, string>;

function parseVars(block: string): Theme {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]));
}

const light = parseVars(tokens.slice(tokens.indexOf('prefers-color-scheme: light')));
const dark = parseVars(tokens.slice(0, tokens.indexOf('@media')));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

for (const [name, theme] of [['dark', dark], ['light', light]] as const) {
  for (const token of ['fg', 'muted', 'accent']) {
    test(`${token} text meets WCAG AA (4.5:1) on the ${name} background`, () => {
      expect(contrast(theme[token]!, theme.bg!)).toBeGreaterThanOrEqual(4.5);
    });
  }
}

test('every interactive control has a visible keyboard focus style', () => {
  expect(html).toContain('button:focus-visible');
  expect(html).toContain('select:focus-visible');
  expect(html).toContain('input:focus-visible');
  expect(html).toContain('#explain summary:focus-visible');
});

test('no positive tabindex reorders keyboard navigation', () => {
  expect(html).not.toMatch(/tabindex="[1-9]/);
});

test('the explanation toggle is a native summary so Enter and Space work', () => {
  expect(html).toMatch(/<details id="explain"[^>]*>\s*<summary>/);
});

test('phone widths enlarge touch targets', () => {
  expect(html).toMatch(/@media \(max-width:40rem\)[\s\S]*min-height:44px/);
});

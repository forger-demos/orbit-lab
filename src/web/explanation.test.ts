import {expect, test} from 'bun:test';
import {synodicPeriodDays} from '../core/pair';
import {EXPLANATION_SOURCES, explanationParagraphs, synodicMonths} from './explanation';

const EARTH = 'earthMoonBarycenter';

test('Earth-Mars synodic period is about 26 months', () => {
  expect(synodicMonths(EARTH, 'mars')).toBe(26);
});

test('synodic period is symmetric and follows the pair', () => {
  expect(synodicPeriodDays(EARTH, 'mars')).toBeCloseTo(synodicPeriodDays('mars', EARTH), 6);
  expect(synodicMonths(EARTH, 'venus')).toBeLessThan(synodicMonths(EARTH, 'mars'));
});

test('the copy names the pair and the computed gap', () => {
  const text = explanationParagraphs(EARTH, 'venus').join(' ');
  expect(text).toContain('Earth and Venus');
  expect(text).toContain(`about ${synodicMonths(EARTH, 'venus')} months`);
  expect(text).toContain('C3');
});

test('every source is an https link', () => {
  expect(EXPLANATION_SOURCES.length).toBeGreaterThan(0);
  for (const s of EXPLANATION_SOURCES) expect(s.url).toStartWith('https://');
});

test('the copy is paraphrased, not lifted from the research note', async () => {
  const note = await Bun.file(new URL('../../docs/research/explanation.md', import.meta.url)).text();
  const sentences = explanationParagraphs(EARTH, 'mars').join(' ').split(/(?<=\.)\s+/);
  for (const sentence of sentences) expect(note).not.toContain(sentence);
});

test('sources are the ones recorded in the research note', async () => {
  const note = await Bun.file(new URL('../../docs/research/explanation.md', import.meta.url)).text();
  for (const s of EXPLANATION_SOURCES) expect(note).toContain(s.url);
});

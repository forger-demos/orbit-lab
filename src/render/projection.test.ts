import {expect, test} from 'bun:test';
import {OUTER_EDGE_AU, project} from './projection';

const view = {width: 400, height: 300};

test('the Sun maps to the centre', () => {
  expect(project([0, 0, 0], view)).toEqual({x: 200, y: 150});
});

test('the outer edge lands inside the shorter side with a margin, on any bearing', () => {
  for (const a of [0, 1, 2, 3, 4, 5]) {
    const p = project([OUTER_EDGE_AU * Math.cos(a), OUTER_EDGE_AU * Math.sin(a), 0], view);
    expect(Math.hypot(p.x - 200, p.y - 150)).toBeCloseTo(150 - 28, 6);
  }
});

test('angle is preserved and +y in the ecliptic points up the screen', () => {
  const p = project([0, 5, 0], view);
  expect(p.x).toBeCloseTo(200, 9);
  expect(p.y).toBeLessThan(150);
});

test('distance is compressed so the inner planets are separated', () => {
  const mercury = project([0.39, 0, 0], view).x - 200;
  const earth = project([1, 0, 0], view).x - 200;
  expect(earth - mercury).toBeGreaterThan(5);
});

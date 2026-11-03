# Rendering and speed

Question: Canvas 2D or WebGL for the orbit view and the plot, how to compute a plot without freezing the page, and what grid size stays interactive.

## Rendering

- The orbit view is a handful of ellipses, eight bodies and one arc: a few dozen draw calls per frame. Canvas 2D handles it at full frame rate on a phone.
- The porkchop plot is a heat map: one pixel-aligned rectangle per cell, or a single `ImageData` written and drawn once. Contours are line segments from marching squares over the same grid. Canvas 2D again; the plot is redrawn when the data changes, not per frame.
- WebGL adds shader code, context-loss handling and a testing burden for no gain at this size. It becomes interesting only for thousands of animated bodies or textured planets, which the brief does not ask for.

## Compute

A cell is one Lambert solve plus two ephemeris lookups. The ephemeris for the departure and arrival axes depends on one date each, so it is computed once per row and column, not per cell. The solver converges in a few iterations. A measurement in the spike, with the ephemeris recomputed for every cell, gave a few microseconds per cell in Bun on a laptop. A grid of a couple of hundred by a couple of hundred cells is therefore a fraction of a second there; a phone is slower by some multiple, and the brief allows a few seconds, so a much finer grid is affordable.

Run the grid in a module Web Worker so the page stays responsive, post progress rows back, and let the main thread paint partial results. Transfer the result as one `Float32Array` per quantity. Bun can bundle the worker for the browser; pure modules are imported by both the worker and tests.

Measure rather than assume: the plan includes a timing test on the pure grid function with a generous bound, and a documented grid size default chosen from a measurement.

## Recommendation

Canvas 2D for both views, one worker for the plot grid, resolution picked from a measured budget, and a lower-resolution first pass followed by refinement so the plot appears at once.

## Sources

- [MDN: Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [MDN: Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [Bun: bundler](https://bun.sh/docs/bundler)

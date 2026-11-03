# Draw with Canvas 2D and compute the plot in a Web Worker

Status: accepted

## Context

Two views, a handful of bodies and a heat map, on a phone and a laptop. See [the rendering note](../research/rendering-and-speed.md).

## Decision

Use Canvas 2D for the orbit view and the plot. Compute the plot grid in one module Web Worker, post it back as typed arrays, and paint a coarse pass first. We chose this over WebGL, which adds shader and context-loss cost for no visible gain here.

## Consequences

- The grid function is pure and shared by the worker and the tests; the worker is a thin wrapper.
- Resolution is chosen from a measured budget, not guessed.
- Bun bundles the browser code; no framework is added.

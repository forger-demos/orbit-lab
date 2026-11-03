# Keep maths pure and write the explanation from primary sources

Status: accepted

## Context

The brief asks for tested orbital maths apart from rendering, and for a plain-words explanation. See [the explanation note](../research/explanation.md).

## Decision

Split the code into layers in `.forger/architecture.json`: `core` is pure maths and data with no DOM, network or clock; `render` draws core results on a canvas; `web` wires the DOM, the worker and input; `server` serves the static files. The explanation panel paraphrases NASA and JPL sources and computes the synodic period instead of quoting it.

## Consequences

- Core is tested without a browser and cannot import render or web.
- The same grid function runs in tests, in the worker and in any later tool.

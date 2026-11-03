# Solve Lambert's problem with Izzo's algorithm

Status: accepted

## Context

Every plot cell is one Lambert solve, so the solver must be fast and robust. See [the Lambert note](../research/lambert.md).

## Decision

Implement Izzo's 2015 algorithm for zero revolutions, in a pure module that returns an explicit no-solution result for nearly opposed vectors or non-convergence. We chose it over universal variables (slower, fragile near parabolic) and Gooding (equally robust, harder to implement). Multiple revolutions are out of scope until a ticket asks.

## Consequences

- The solver passes a textbook case and a real launch and lives in `src/core/lambert.ts`.
- A failed cell is blank in the plot, never a thrown error.
- Tests carry known answers from Curtis and the validation note, never the network.

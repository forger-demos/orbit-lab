# Lambert's problem: the transfer between two points in a given time

Question: which solver turns "leave Earth at this position, arrive at Mars at that position, in this time" into the two velocities, robustly enough to run for every cell of a plot.

## Options

| Solver | Notes |
|---|---|
| Universal variables (Bate, Mueller and White; Curtis; Vallado) | Textbook, simple, well documented. Converges slowly or needs bracketing near parabolic and near 180 degree transfers. Many iterations per solve. |
| Gooding (1990) | The long-standing reference for robustness, including multiple revolutions. Intricate to implement. |
| Izzo (2015), building on Lancaster and Blanchard (1968) | One variable for all conic types, a good starting guess, Householder iteration. The paper reports it as accurate as Gooding's procedure at lower cost, and about two iterations for the single-revolution case. Used by ESA's pykep. |

## Robustness

- 180 degree transfers: when the two position vectors are opposed, every plane containing the line is valid, so the plane is undefined. For planets the inclination of Mars (about 1.85 degrees) keeps real transfers away from exact opposition, but a plot grid can land near it. The product must treat a nearly-opposed pair as "no solution drawn" rather than a number from a degenerate plane.
- Multi-revolution transfers: Izzo's formulation supports them with up to two solutions per revolution count. Not needed for the brief (a first plot with zero revolutions); long arrival-minus-launch spans can add them later.
- Prograde versus retrograde is a flag, set once; planetary transfers are prograde.

## Test cases

- Curtis, "Orbital Mechanics for Engineering Students", Example 5.2: r1 = (5000, 10000, 2100) km, r2 = (-14600, 2500, 7000) km, 3600 s around Earth gives v1 = (-5.9925, 1.9254, 3.2456) km/s and v2 = (-3.3125, -4.1966, -0.38529) km/s. Reproduced by the spike solver within 2 m/s.
- Energy conservation between the two ends of the returned arc (a property test).
- The Perseverance transfer in `validation.md`.
- Further cases to add in the build: the pykep test set and Izzo's published tables, a retrograde case, a hyperbolic case.

## Result of the spike

A single-revolution Izzo solver was written in about a hundred lines (`src/core/spike/lambert.ts`) and passes the Curtis case and the Perseverance check. It needs no tuning constants beyond a convergence tolerance.

The spike also swept a grid of launch and arrival dates in 2020 with arrival after launch: Householder alone failed on short, hyperbolic flights (a real bug found by a test); a bisection fallback on the monotonic time-of-flight curve fixed it. A very small share of cells still fails, near the degenerate geometry above. The build must therefore handle a failed cell as blank and test that the grid function never throws.

## Recommendation

Implement Izzo's algorithm in a pure module, zero revolutions first, with an explicit result type for "no solution" (nearly opposed vectors, non-convergence) so a plot cell can be left blank. Add multi-revolution only if a later ticket asks.

## Sources

- D. Izzo, ["Revisiting Lambert's Problem", Celestial Mechanics and Dynamical Astronomy (2015), arXiv:1403.2705](https://arxiv.org/abs/1403.2705)
- Lancaster and Blanchard, "A Unified Form of Lambert's Theorem", NASA Goddard, 1968
- R. H. Gooding, "A procedure for the solution of Lambert's orbital boundary-value problem", Celestial Mechanics and Dynamical Astronomy 48 (1990)
- [Lambert's problem, overview and references](https://en.wikipedia.org/wiki/Lambert%27s_problem)
- [pykep (ESA), MPL-2.0](https://github.com/esa/pykep) for cross-checking numbers offline during development, not a run-time dependency

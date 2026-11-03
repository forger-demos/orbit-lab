# Use JPL approximate Keplerian elements for planet positions

Status: accepted

## Context

The page needs planet positions for 1900-2100 within a fraction of a degree, shipped with the page and with no network use. See [the ephemeris note](../research/ephemeris.md).

## Decision

Compute positions from the JPL approximate Keplerian elements: Table 1 inside its stated range and Table 2a plus the Table 2b terms outside it. We chose this over VSOP87, whose extra accuracy the brief does not need at hundreds of times the data, and over JPL DE files, which do not ship with a page.

## Consequences

- The data is a small typed constant in a pure module; positions are cheap enough to recompute per frame and per grid axis.
- Positions are for the Earth-Moon barycentre and are in TT; both are documented limits, far below the accuracy that matters.
- Swapping to a more precise model later touches one module behind a function signature.

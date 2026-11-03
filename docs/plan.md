# Build plan

Each slice ends in something visible in a screenshot, names its acceptance, and keeps maths and data in `src/core` apart from drawing in `src/render` and wiring in `src/web` (see [ADR 5](adr/0005-layers-and-explanation.md)). Decisions are in `docs/adr/`, evidence in `docs/research/`. The spike code in `src/core/spike/` is the starting point for slices 1 and 3 and is moved, not rewritten.

## Order

1. **Solar system for a date.** Promote the ephemeris to `src/core/ephemeris.ts` for all eight planets (JPL Table 1 and 2a/2b by date range, ADR 1). Draw orbits and planets on a Canvas for a date picked in a field, readable on a phone, light and dark. Visible: the real inner and outer solar system on a chosen date. Acceptance: tests against JPL-derived known positions across 1900-2100 within the stated arc-second accuracy; the screenshot shows planets on their orbits.
2. **Time controls.** A slider across 1900-2100 and play controls at several speeds, years per second. Pure clock-stepping in core. Visible: the planets moving. Acceptance: stepping is deterministic and tested; playing does not drift the date; controls are keyboard reachable.
3. **Lambert and the Earth-Mars transfer.** Promote the solver to `src/core/lambert.ts` with an explicit no-solution result, and a transfer function giving departure C3 and arrival v-infinity. Visible: a small readout for a chosen launch and arrival date. Acceptance: the Curtis case, the Mars 2020 C3 within ten percent, a property test of energy conservation, and no throw for any date pair.
4. **Porkchop plot.** A pure grid function, a Web Worker, and a Canvas heat map with C3 colour, arrival-speed contours and axes, partial results painted first (ADR 4). Visible: the familiar islands about every 26 months. Acceptance: grid tested for shape and blank cells; island spacing near the synodic period; a timing test within a generous bound.
5. **Click a cell to see the trip.** Draw the transfer arc in the solar system view and play the spacecraft from Earth to where Mars arrives. Needs the arc sampled by Kepler propagation in core. Visible: the arc and the ship. Acceptance: the arc starts at Earth and ends at Mars at the chosen dates, tested.
6. **Checked against history.** Mark real launches (Mars 2020 with its published C3, dates only for MAVEN and MSL until their C3 is read from source) and show the best cell near each. Visible: markers on the plot. Acceptance: best cell within days of the real launch and within ten percent of the published C3 where one is sourced.
7. **Any pair of planets.** Choose origin and destination; axis ranges follow the synodic period. Visible: an Earth to Venus or Jupiter plot. Acceptance: the grid is generic over the pair, tested for Earth to Venus window spacing.
8. **Explanation panel and polish.** The plain-words panel from the explanation note, with the synodic period computed, and responsive and dark-mode checks. Visible: the panel beside the plot. Acceptance: copy reviewed against the sources, layout checked at phone and laptop widths.
9. **Showcase.** The README opens with screenshots and a short story of what the page shows, linking the research and plan.

## Out of scope for now

Gravity-assist mode: it needs a flyby model and a search over intermediate dates and bodies, which is a separate piece of research and is deferred until the plot is shipped. Multi-revolution transfers wait for a request (ADR 2).

## Tooling

Browser code is bundled by Bun from `src/web`; screenshots come from the UI config in `.forger/ui.json`. Gate: `bun run check`.

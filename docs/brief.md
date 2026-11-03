# Brief: plan a trip to Mars

I want a page that shows the solar system as it really is on any date, and tells me when to launch to another planet and what it costs.

## What I want to see

- The planets on their real orbits for the date I pick, with a time slider and play controls that run years by in seconds. Positions match a reputable source to within a fraction of a degree for 1900 to 2100.
- A porkchop plot for Earth to Mars: launch date across, arrival date up, coloured by the energy needed at departure, with the arrival speed as contours. The real launch windows show up as the familiar islands, about every 26 months.
- Clicking any cell draws that transfer arc in the solar system view and plays the trip: the spacecraft leaves Earth and arrives where Mars will be.
- The same for any pair of planets, and a gravity-assist mode later if the research says it is tractable.
- A short explanation panel in plain words: why windows recur, why some transfers are cheap.

## What makes it right

- Checked against history: the plot's best cells near real launches (for example the July 2020 window that Perseverance used) land within a few days of the real dates and within ten percent of the published departure energy.
- The orbital maths is pure, tested code with known answers from textbooks or published tables; tests never touch the network.
- Fast: a full porkchop plot computes in a few seconds in the browser without freezing the page.

## Constraints

No API keys and no paid services. Data needed at run time ships with the page. Works on a phone and a laptop, light and dark.

## How to start

Research before building: which ephemeris and accuracy, which Lambert solver, how to validate, Canvas or WebGL. Write it down with the sources, decide, then plan the build as small slices that each end in something I can see, and start building straight after.

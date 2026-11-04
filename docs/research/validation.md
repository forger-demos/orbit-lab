# Validation: what the plot is checked against

Question: which real launches and published numbers can the build check itself against, and how closely.

## The riskiest assumption, checked

Claim: a Lambert solve between Earth and Mars, with the JPL approximate ephemeris, reproduces a published departure energy within ten percent.

Check (`src/core/transfer.test.ts`): Mars 2020 (Perseverance) launched 2020-07-30 at 11:50 UTC (7:50 a.m. EDT) and entered the Martian atmosphere on 2021-02-18 at 20:36:50 UTC. The heliocentric Lambert arc from the Earth-Moon barycentre at launch to Mars at entry gives a departure C3 of 14.494 km^2/s^2. The published separation C3 is 14.49 km^2/s^2. The difference is far inside the ten percent bar. Arrival v-infinity of the same arc is about 2.55 km/s.

Caveat recorded plainly: the agreement is closer than the ephemeris accuracy alone would promise, because small position errors largely cancel in C3. The tolerance in the test stays at ten percent, matching the brief, not at the observed difference.

## Reference data

| Mission | Launch | Arrival | Published departure C3 | Status |
|---|---|---|---|---|
| Mars 2020 Perseverance | 2020-07-30 | 2021-02-18 | 14.49 km^2/s^2 (ULA mission booklet); 14.5016 in a 2024 Politecnico thesis | Verified, used in a test |
| MAVEN | 2013-11-18 (window 18 Nov to 7 Dec) | 2014-09-22 | Not found in any source read | Dates only; no number asserted |
| Mars Science Laboratory | 2011-11-26 | 2012-08-06 | Not found in any source read; the AAS paper by Abilleira (NTRS 20150007334) is the likely source | Dates only |

Use only the verified row as a hard assertion. MAVEN and MSL give a launch-date and arrival-date check: the best cell of the plot should sit within days of those dates. A later pass must find and record the C3 values from the Abilleira paper and the MAVEN mission documents before asserting them, and must leave a case out rather than invent it.

The Perseverance launch period ran 2020-07-20 to 2020-08-11, which gives a second check: the plot's low-energy island for that window must cover those dates.

## Results on the plot

The page marks each launch in the table at its real launch and arrival dates and draws a small ring at the lowest-C3 cell found near it. The table is `REAL_LAUNCHES` in `src/core/launches.ts`; every record carries its source links, and the tooltip on a marker states the dates, the published C3 if there is one, the best cell and the first source. `src/core/launches.test.ts` runs the same checks over every record.

- The search window is a few days either side of the real launch and arrival dates (the constants sit beside `bestCellNear`). Real launches are chosen for more than minimum energy (launch period, vehicle, range), so the lowest-C3 cell in a window is usually a little off the real date and a little below the published C3; the test asserts the offset stays inside the window and, for Mars 2020, that C3 is within ten percent of 14.49.
- MAVEN and MSL are checked on dates only. Their C3 stays out until it is read from a primary source and linked above.
- To see the current numbers, run `bun test src/core/launches.test.ts`; the values are not copied here.

## Published porkchop plots

Porkchop plots appear in the JPL mission design papers and in Vallado and Curtis. The build should compare shapes (island position, spacing near 26 months) against these, not numbers read off a figure.

## Sources

- [Mars 2020 launch press kit, JPL](https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/)
- [Mars 2020 mission booklet, ULA](https://www.ulalaunch.com/docs/default-source/launch-booklets/mars2020_mobrochure_200717.pdf) (C3 14.49)
- [MSL trajectory reconstruction, Abilleira, NTRS](https://ntrs.nasa.gov/citations/20150007334)
- [MAVEN launch notes, The Planetary Society](https://www.planetary.org/articles/11140900-maven-launch-faq)

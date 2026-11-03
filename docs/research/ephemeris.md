# Ephemeris: where are the planets on a given date

Question: which source and model gives planet positions for 1900-2100 to a fraction of a degree, with a small data footprint and a licence that lets the page ship it.

## Options

| Option | Accuracy | Footprint | Licence |
|---|---|---|---|
| JPL approximate Keplerian elements, Table 1 (1800-2050) | Earth-Moon barycentre 20 arcsec longitude, Mars 40 arcsec longitude, distance within about 25000 km | Six elements and six rates per planet, a few hundred bytes in total | US Government work published by JPL; no restriction stated on the page |
| JPL approximate elements, Table 2a/2b (3000 BC to 3000 AD) | Roughly double the error of Table 1 (Mars 100 arcsec longitude) | Same, plus four extra terms for Jupiter to Neptune | As above |
| VSOP87 (Bretagnon and Francou 1988) | About 1 arcsec for Mercury to Mars over millennia | Thousands of series terms per planet and coordinate; hundreds of kilobytes for eight planets even truncated | Distributed publicly through CDS VizieR (catalogue VI/81); the catalogue page states no licence text |
| JPL DE ephemerides (Horizons) | Reference quality | Chebyshev files of many megabytes, or a network call | Public, but the data does not fit "ships with the page" cheaply |

All the accuracy values for the JPL elements are from the publisher's table on the JPL page. The VSOP87 accuracy is from the original paper as summarised by CDS; not independently re-derived here.

## What the brief needs

The brief asks for "a fraction of a degree" for 1900 to 2100. One arcsecond is 1/3600 of a degree, so even the 40 arcsec worst case in Table 1 is about 0.011 degrees, far inside the requirement, and well below a pixel at any plausible zoom. The Lambert check in `lambert.md` and `validation.md` shows the elements are also good enough to reproduce a published departure energy.

Table 1 is stated valid to 2050, but the brief wants 2100. Table 2a covers the full range at lower accuracy, and is still within 100 arcsec (0.03 degrees) for Mars. Neither table needs the Jupiter-to-Neptune correction terms inside its stated range for the planets Mercury to Mars; Table 2a does need them for the outer planets, and they are a one-line addition to the mean anomaly.

## Recommendation

Use the JPL approximate elements. Use Table 1 values for 1900-2050 and Table 2a plus the Table 2b terms for dates outside it, switching by date so each range has the better set. Keep the data as a typed constant in a pure module. VSOP87 is accuracy the product does not need at several hundred times the size.

Known limits to document in the product: the elements model the Earth-Moon barycentre, not the Earth (a displacement of at most a few thousand kilometres, invisible at this scale), and time is treated as TT while UTC is used for input (about a minute of error, negligible against a 40 arcsec figure).

## Sources

- [Keplerian Elements for Approximate Positions of the Major Planets, JPL SSD](https://ssd.jpl.nasa.gov/planets/approx_pos.html) (tables, ranges, accuracy, the algorithm)
- [VSOP87 catalogue VI/81, CDS VizieR](https://vizier.cfa.harvard.edu/ftp/cats/vi/81/vsop87.txt)
- Bretagnon and Francou, "Planetary theories in rectangular and spherical variables: VSOP87 solutions", Astronomy and Astrophysics 202, 309 (1988)

## Checked against Horizons

`src/core/ephemeris.test.ts` compares the shipped elements with fixed vectors taken from JPL Horizons (heliocentric, ecliptic, TDB) for all eight bodies at dates spread across 1900-2100. The JPL page's accuracy figures are typical errors, not bounds, so the test asserts the brief's bound directly: longitude within 0.25 degrees and distance within 0.5 percent, with no multiple applied. Re-take the vectors from the [Horizons API](https://ssd.jpl.nasa.gov/api/horizons.api) with `COMMAND` set to the body id (the Earth-Moon barycentre is `3`), `CENTER='500@10'`, `EPHEM_TYPE='VECTORS'` and `REF_PLANE='ECLIPTIC'`.

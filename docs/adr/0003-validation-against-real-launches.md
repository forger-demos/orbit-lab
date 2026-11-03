# Validate against published launches and a textbook solution

Status: accepted

## Context

The brief requires results within days of real launch dates and within ten percent of published departure energy. See [the validation note](../research/validation.md).

## Decision

Assert hard only on values verified from a primary source: the Mars 2020 departure C3, its launch and arrival dates, and the Curtis Lambert example. Missions whose C3 was not found stay date-only until the figure is read from its source. Porkchop plots are compared by shape, not by numbers read off a figure.

## Consequences

- The riskiest assumption is a passing test in the repository.
- Adding a mission is a data change plus a cited source; a number without a source is not added.

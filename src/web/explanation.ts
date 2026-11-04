import {type Body} from '../core/ephemeris';
import {BODY_NAMES, synodicPeriodDays} from '../core/pair';

const DAYS_PER_MONTH = 30.4375;

export interface ExplanationSource {
  label: string;
  url: string;
}

export const EXPLANATION_SOURCES: readonly ExplanationSource[] = [
  {label: 'NASA, Basics of Space Flight: Trajectories', url: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/'},
  {label: 'JPL, Mars 2020 launch press kit', url: 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/'},
  {label: 'Synodic period, overview', url: 'https://en.wikipedia.org/wiki/Orbital_period#Synodic_period'},
];

/** The gap between launch windows for a pair, in whole months, computed from the ephemeris periods. */
export function synodicMonths(from: Body, to: Body): number {
  return Math.round(synodicPeriodDays(from, to) / DAYS_PER_MONTH);
}

/** Plain-words paragraphs for the chosen pair; the synodic gap is computed, never typed. */
export function explanationParagraphs(from: Body, to: Body): string[] {
  const a = BODY_NAMES[from];
  const b = BODY_NAMES[to];
  const months = synodicMonths(from, to);
  return [
    `Why windows repeat: ${a} and ${b} circle the Sun at different speeds, so they line up well for a transfer only now and then. The gap between alignments is the synodic period, about ${months} months for this pair. That is why the bright islands on the plot come round again and again.`,
    `How to read the plot: each point is a launch day (across) and an arrival day (up). The colour is the energy the launch needs, called C3 and measured in km^2/s^2; lower is cheaper. Dark-to-bright islands mark cheap trips, and the rims are costly because the ship must go faster or take an awkward route.`,
    `The contour lines show how fast the ship arrives relative to ${b}, which sets how much it must slow down to be captured.`,
    `The cheapest trip is not always the shortest: a slightly longer flight is often cheaper, so the best cell can sit beside a quicker but costlier one.`,
  ];
}

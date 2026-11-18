// The test grid: 5 lengths x 5 depths x 3 replicas = 75 haystacks. Each
// replica is a different log (its own seed), not a repeat of the same one.
// Scenarios rotate so that every length gets each scenario 3 times and every
// depth gets each scenario 3 times over the grid.
import { SCENARIO_ORDER } from './scenarios.mjs';

export const LENGTHS = [10_000, 25_000, 50_000, 100_000, 200_000];
export const DEPTHS = [0, 0.25, 0.5, 0.75, 1];
export const REPS = [1, 2, 3];

export const idOf = (tokens, depth, rep) => `t${String(tokens / 1000).padStart(3, '0')}k-d${String(Math.round(depth * 100)).padStart(3, '0')}-r${rep}`;

export function gridSpecs() {
  const specs = [];
  LENGTHS.forEach((tokens, li) =>
    DEPTHS.forEach((depth, di) =>
      REPS.forEach((rep) => {
        const scenario = SCENARIO_ORDER[(di + rep + li) % SCENARIO_ORDER.length];
        specs.push({ id: idOf(tokens, depth, rep), tokens, depth, rep, scenario });
      }),
    ),
  );
  return specs;
}

import { Difficulty } from "types/Track.type";

/**
 * Returns the number of progress ticks (out of 40) awarded per progress mark
 * at the given difficulty rank. Mirrors the Ironsworn/Starforged rules:
 * Troublesome=12 ticks (3 boxes), Dangerous=8 (2 boxes), Formidable=4 (1 box),
 * Extreme=2 (half box), Epic=1 (quarter box).
 */
export function getDifficultyStep(difficulty: Difficulty): number {
  switch (difficulty) {
    case Difficulty.Troublesome:
      return 12;
    case Difficulty.Dangerous:
      return 8;
    case Difficulty.Formidable:
      return 4;
    case Difficulty.Extreme:
      return 2;
    case Difficulty.Epic:
      return 1;
  }
}

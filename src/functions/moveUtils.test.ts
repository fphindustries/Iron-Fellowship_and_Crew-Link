import { describe, it, expect } from "vitest";
import { getDifficultyStep } from "./moveUtils";
import { Difficulty } from "types/Track.type";

describe("getDifficultyStep", () => {
  it("returns 12 ticks (3 boxes) for Troublesome", () => {
    expect(getDifficultyStep(Difficulty.Troublesome)).toBe(12);
  });

  it("returns 8 ticks (2 boxes) for Dangerous", () => {
    expect(getDifficultyStep(Difficulty.Dangerous)).toBe(8);
  });

  it("returns 4 ticks (1 box) for Formidable", () => {
    expect(getDifficultyStep(Difficulty.Formidable)).toBe(4);
  });

  it("returns 2 ticks (half box) for Extreme", () => {
    expect(getDifficultyStep(Difficulty.Extreme)).toBe(2);
  });

  it("returns 1 tick (quarter box) for Epic", () => {
    expect(getDifficultyStep(Difficulty.Epic)).toBe(1);
  });
});

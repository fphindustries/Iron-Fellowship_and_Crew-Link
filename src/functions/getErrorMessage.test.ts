import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./getErrorMessage";

describe("getErrorMessage", () => {
  it("returns string errors directly", () => {
    expect(getErrorMessage("oops", "fallback")).toBe("oops");
  });

  it("returns the .message property of Error objects", () => {
    expect(getErrorMessage(new Error("bad thing"), "fallback")).toBe(
      "bad thing"
    );
  });

  it("returns the .error property when .message is absent", () => {
    expect(getErrorMessage({ error: "api error" }, "fallback")).toBe(
      "api error"
    );
  });

  it("returns the fallback for unrecognized shapes", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(42, "fallback")).toBe("fallback");
    expect(getErrorMessage({}, "fallback")).toBe("fallback");
  });
});

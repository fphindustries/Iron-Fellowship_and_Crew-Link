import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Run RTL cleanup after every test
afterEach(() => {
  cleanup();
});

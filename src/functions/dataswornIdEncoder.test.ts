import { describe, it, expect } from "vitest";
import {
  encodeDataswornId,
  decodeDataswornId,
  encodeContents,
  convertIdPart,
  generateCustomDataswornId,
  generateAssetDataswornId,
  encodeAndConstructDataswornId,
} from "./dataswornIdEncoder";

describe("encodeDataswornId / decodeDataswornId", () => {
  it("encodes and decodes special characters round-trip", () => {
    const id = "ironsworn/classic/oracle/name:hero";
    expect(decodeDataswornId(encodeDataswornId(id))).toBe(id);
  });

  it("encodes colons", () => {
    const encoded = encodeDataswornId("a:b");
    expect(encoded).toBe("a%3Ab");
  });
});

describe("encodeContents", () => {
  it("lowercases and replaces spaces with underscores", () => {
    expect(encodeContents("Hello World")).toBe("hello_world");
  });

  it("strips forward slashes", () => {
    expect(encodeContents("path/segment")).toBe("pathsegment");
  });

  it("throws when the sanitized result is empty", () => {
    expect(() => encodeContents("///")).toThrow("Failed to generate custom id");
    expect(() => encodeContents("")).toThrow("Failed to generate custom id");
  });
});

describe("convertIdPart", () => {
  it("lowercases and replaces spaces with underscores", () => {
    expect(convertIdPart("Hello World")).toBe("hello_world");
  });

  it("removes characters not in [a-z0-9_]", () => {
    expect(convertIdPart("my-move!")).toBe("mymove");
  });

  it("throws when result is less than 3 characters", () => {
    expect(() => convertIdPart("ab")).toThrow("Failed to create valid ID");
  });

  it("replaces numbers when replaceNumbers is true", () => {
    const result = convertIdPart("move1", { replaceNumbers: true });
    expect(result).toBe("moveone");
  });
});

describe("generateCustomDataswornId", () => {
  it("builds an id with /custom/ segment", () => {
    const id = generateCustomDataswornId("ironsworn/move", "My Move");
    expect(id).toBe("ironsworn/move/custom/my_move");
  });
});

describe("generateAssetDataswornId", () => {
  it("builds an id from group and contents", () => {
    const id = generateAssetDataswornId("starforged/asset/path", "Blade");
    expect(id).toBe("starforged/asset/path/blade");
  });
});

describe("encodeAndConstructDataswornId", () => {
  it("constructs a full id with midsection", () => {
    const id = encodeAndConstructDataswornId("MYHB", "oracle", "Star Name");
    expect(id).toBe("myhb/oracle/star_name");
  });
});

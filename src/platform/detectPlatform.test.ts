import { describe, expect, it } from "vitest";
import { detectPlatform } from "./detectPlatform";

describe("detectPlatform", () => {
  it("uses the explicit query override", () => {
    expect(detectPlatform("?platform=android")).toBe("android");
    expect(detectPlatform("?platform=ios")).toBe("ios");
  });

  it("defaults to the iPhone shell when there is no Android signal", () => {
    expect(detectPlatform("")).toBe("ios");
  });
});

import { describe, expect, it } from "vitest";
import { greetingName, initials } from "./names";

describe("greetingName", () => {
  it("prefers the homepage nickname", () => {
    expect(
      greetingName(
        { display_name: "Test Person", nickname: "sunny" },
        "person@example.test"
      )
    ).toBe("sunny");
  });

  it("ignores a blank nickname", () => {
    expect(greetingName({ display_name: "Test Person", nickname: "   " })).toBe("Test");
  });

  it("falls back to the display name then the email local part", () => {
    expect(greetingName({ display_name: "Sample User" })).toBe("Sample");
    expect(greetingName({ display_name: "" }, "ledger@example.test")).toBe("ledger");
    expect(greetingName(null, null)).toBe("there");
  });
});

describe("initials", () => {
  it("uses the first two words", () => {
    expect(initials("Test Person")).toBe("TP");
    expect(initials("salo")).toBe("SA");
  });
});

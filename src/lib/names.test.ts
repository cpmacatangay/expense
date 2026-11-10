import { describe, expect, it } from "vitest";
import { greetingName, initials } from "./names";

describe("greetingName", () => {
  it("prefers the homepage nickname", () => {
    expect(
      greetingName(
        { display_name: "[redacted-name]", nickname: "boi ldr" },
        "[redacted-email]"
      )
    ).toBe("boi ldr");
  });

  it("ignores a blank nickname", () => {
    expect(
      greetingName({ display_name: "[redacted-name]", nickname: "   " })
    ).toBe("Kent");
  });

  it("falls back to the display name then the email local part", () => {
    expect(greetingName({ display_name: "[redacted-name]" })).toBe("Hannah");
    expect(greetingName({ display_name: "" }, "backburner@example.com")).toBe("backburner");
    expect(greetingName(null, null)).toBe("there");
  });
});

describe("initials", () => {
  it("uses the first two words", () => {
    expect(initials("[redacted-name]")).toBe("CP");
    expect(initials("backburner")).toBe("BA");
  });
});

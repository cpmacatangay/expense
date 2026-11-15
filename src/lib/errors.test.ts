import { describe, expect, it } from "vitest";
import { getErrorMessage, isNetworkError } from "./errors";

describe("getErrorMessage", () => {
  it("turns a network failure into a connection message", () => {
    expect(getErrorMessage(new TypeError("Failed to fetch"), "Fallback")).toBe(
      "No connection. Check your network and try again."
    );
  });

  it("turns a failed lazy chunk into a screen message", () => {
    expect(
      getErrorMessage(
        new TypeError("Failed to fetch dynamically imported module: /assets/LedgerPage.js"),
        "Fallback"
      )
    ).toBe("This screen did not load. Check your connection and try again.");
  });

  it("keeps a server message", () => {
    expect(getErrorMessage(new Error("Invitation not found or expired"), "Fallback")).toBe(
      "Invitation not found or expired"
    );
  });

  it("uses the fallback for an unknown value", () => {
    expect(getErrorMessage(null, "Could not save")).toBe("Could not save");
  });
});

describe("isNetworkError", () => {
  it("recognises failures that should not be retried", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("The request timed out"))).toBe(true);
    expect(isNetworkError(new Error("permission denied for table outings"))).toBe(false);
  });
});

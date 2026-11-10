export type Platform = "ios" | "android";

export function detectPlatform(search = window.location.search): Platform {
  const override = new URLSearchParams(search).get("platform");
  if (override === "ios" || override === "android") return override;

  const userAgent = navigator.userAgent;
  if (/Android/i.test(userAgent)) return "android";
  return "ios";
}

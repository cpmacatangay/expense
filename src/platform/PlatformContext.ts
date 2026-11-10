import { createContext, useContext } from "react";
import type { Platform } from "./detectPlatform";

export type PlatformContextValue = {
  platform: Platform;
};

export const PlatformContext = createContext<PlatformContextValue | null>(null);

export function usePlatform(): PlatformContextValue {
  const value = useContext(PlatformContext);
  if (!value) throw new Error("usePlatform must be used inside PlatformProvider");
  return value;
}

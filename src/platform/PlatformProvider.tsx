import { useEffect, useMemo, useState, type ReactNode } from "react";
import { detectPlatform, type Platform } from "./detectPlatform";
import { PlatformContext } from "./PlatformContext";

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform] = useState<Platform>(() => detectPlatform());

  useEffect(() => {
    document.documentElement.dataset.platform = platform;
  }, [platform]);

  const value = useMemo(() => ({ platform }), [platform]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

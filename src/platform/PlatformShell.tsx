import { usePlatform } from "./PlatformContext";
import { AndroidShell } from "./android/AndroidShell";
import { IOSShell } from "./ios/IOSShell";

export function PlatformShell() {
  const { platform } = usePlatform();
  return platform === "android" ? <AndroidShell /> : <IOSShell />;
}

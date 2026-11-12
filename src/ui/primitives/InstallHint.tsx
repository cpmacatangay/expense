import { useEffect, useState } from "react";

function isStandalone() {
  if (typeof window === "undefined") return true;

  const displayMode =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return displayMode || iosStandalone;
}

export function InstallHint() {
  const [standalone, setStandalone] = useState(isStandalone);

  useEffect(() => {
    setStandalone(isStandalone());
  }, []);

  if (standalone) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <section className="panel" aria-label="Install">
      <h2 className="panel-title">Add Salo to your home screen</h2>
      <p className="panel-copy">
        {isIOS
          ? "In Safari, tap Share, then Add to Home Screen."
          : "In your browser menu, choose Install app or Add to Home screen."}
      </p>
      <p className="panel-copy">It opens like an app and keeps the shared ledger one tap away.</p>
    </section>
  );
}

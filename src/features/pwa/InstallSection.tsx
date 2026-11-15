import { useEffect, useState } from "react";
import { Icon } from "@/ui/primitives/Icon";
import { isIOS, isStandalone, promptInstall, useInstallPrompt } from "./install";

export function InstallSection() {
  const prompt = useInstallPrompt();
  const [installed, setInstalled] = useState(isStandalone);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const ios = isIOS();

  useEffect(() => {
    const update = () => setInstalled(isStandalone());
    window.addEventListener("appinstalled", update);
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;
    media?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("appinstalled", update);
      media?.removeEventListener?.("change", update);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    setBusy(true);
    setNotice(null);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setInstalled(true);
        return;
      }
      setNotice(
        outcome === "dismissed"
          ? "Install canceled. You can try again from your browser menu."
          : "Use your browser menu to install Salo."
      );
    } catch {
      setNotice("Use your browser menu to install Salo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Install Salo</h2>
      <p className="panel-copy">
        {ios && !prompt
          ? "In Safari, tap Share, then Add to Home Screen."
          : prompt
            ? "Install Salo for one-tap access. It opens like an app and keeps the ledger a tap away."
            : "In your browser menu, choose Install app or Add to Home screen."}
      </p>
      {prompt ? (
        <div className="export-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={() => void handleInstall()}
            disabled={busy}
          >
            <Icon name="download" />
            {busy ? "Opening…" : "Install Salo"}
          </button>
        </div>
      ) : null}
      {notice ? (
        <p className="form-notice" role="status">
          {notice}
        </p>
      ) : null}
    </section>
  );
}

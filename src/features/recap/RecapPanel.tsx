import { useEffect, useMemo, useState } from "react";
import type { Adult } from "@/features/groups/types";
import type { Outing } from "@/features/outings/types";
import { getErrorMessage } from "@/lib/errors";
import { buildRecap, type RecapShare } from "./buildRecap";
import { renderRecapImage } from "./renderRecapImage";
import { copyRecapText, downloadRecapImage, shareRecap } from "./shareRecap";

type Props = {
  groupName: string;
  outing: Outing;
  shares: RecapShare[];
  adults: Adult[];
};

export function RecapPanel({ groupName, outing, shares, adults }: Props) {
  const recap = useMemo(
    () => buildRecap({ groupName, outing, shares, adults }),
    [groupName, outing, shares, adults]
  );

  const [preview, setPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"share" | "image" | "copy" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setPreview(null);
    setPreviewError(null);

    renderRecapImage(recap)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      })
      .catch((caught) => {
        if (!cancelled) {
          setPreviewError(getErrorMessage(caught, "Could not preview the recap"));
        }
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [recap]);

  async function handleShare() {
    setBusy("share");
    setError(null);
    setNotice(null);
    try {
      const result = await shareRecap(recap);
      if (result === "shared") setNotice("Recap shared.");
      if (result === "downloaded") {
        setNotice("Sharing isn't available here. The image downloaded and the text was copied.");
      }
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not share the recap"));
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    setBusy("copy");
    setError(null);
    setNotice(null);
    try {
      await copyRecapText(recap);
      setNotice("Recap text copied.");
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not copy the recap"));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    setBusy("image");
    setError(null);
    setNotice(null);
    try {
      await downloadRecapImage(recap);
      setNotice("Recap image downloaded.");
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not download the recap"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel">
      <span className="panel-label">Recap</span>
      <h2 className="panel-title">Share the table</h2>
      <p className="panel-copy">
        Text and a portrait image. No invite link and no payment QR.
      </p>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="form-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="recap-preview">
        {preview ? (
          <img src={preview} alt={`Recap for ${recap.title}`} />
        ) : (
          <div className="recap-placeholder">
            {previewError ?? "Drawing the recap…"}
          </div>
        )}
      </div>

      <pre className="recap-text">{recap.text}</pre>

      <div className="recap-actions">
        <button
          className="primary-action"
          type="button"
          onClick={() => void handleShare()}
          disabled={busy !== null}
        >
          {busy === "share" ? "Preparing…" : "Share recap"}
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={() => void handleCopy()}
          disabled={busy !== null}
        >
          {busy === "copy" ? "Copying…" : "Copy text"}
        </button>
        <button
          className="text-action recap-download"
          type="button"
          onClick={() => void handleDownload()}
          disabled={busy !== null}
        >
          {busy === "image" ? "Preparing…" : "Download image"}
        </button>
      </div>
    </section>
  );
}

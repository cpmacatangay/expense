import { downloadBlob, slugifyFilename } from "@/lib/download";
import type { Recap } from "./buildRecap";
import { renderRecapImage } from "./renderRecapImage";

export function recapFileName(recap: Recap): string {
  return `salo-recap-${slugifyFilename(recap.groupName)}-${slugifyFilename(recap.dateLabel)}.png`;
}

export async function copyRecapText(recap: Recap): Promise<void> {
  await navigator.clipboard.writeText(recap.text);
}

export async function downloadRecapImage(recap: Recap): Promise<void> {
  const blob = await renderRecapImage(recap);
  downloadBlob(blob, recapFileName(recap));
}

export async function shareRecap(
  recap: Recap
): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await renderRecapImage(recap);
  const filename = recapFileName(recap);
  const file = new File([blob], filename, { type: "image/png" });

  const canShareFiles =
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], title: recap.title, text: recap.text });
      return "shared";
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return "cancelled";
      // Sharing can be blocked by permissions or an unsupported target. Fall through to download.
    }
  }

  downloadBlob(blob, filename);
  try {
    await navigator.clipboard.writeText(recap.text);
  } catch {
    // Copying is a convenience; the image still downloaded.
  }
  return "downloaded";
}

import { Capacitor } from '@capacitor/core'

export async function shareText(text: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ text, dialogTitle: 'Share recap' })
      return true
    } catch {
      return copyText(text)
    }
  }

  if (navigator.share) {
    const shared = await Promise.race([
      navigator
        .share({ text })
        .then(() => true)
        .catch(() => false),
      new Promise<boolean>((resolve) => {
        window.setTimeout(() => resolve(false), 2500)
      })
    ])
    if (shared) return true
  }

  return copyText(text)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function shareImage(
  blob: Blob,
  filename: string,
  text?: string
): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type || 'image/png' })

  if (Capacitor.isNativePlatform()) {
    // Native file sharing needs a temporary filesystem URI. Text sharing is the
    // reliable fallback for the first release.
    if (text) return shareText(text)
    downloadBlob(blob, filename)
    return true
  }

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
    }
  }

  if (text) await copyText(text)
  downloadBlob(blob, filename)
  return true
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text: string, filename: string, type = 'text/plain'): void {
  downloadBlob(new Blob([text], { type }), filename)
}

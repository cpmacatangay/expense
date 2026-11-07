import { Capacitor } from '@capacitor/core'

export interface CapturedImage {
  blob: Blob
  dataUrl: string
  path?: string
  width: number
  height: number
  mime: string
  source: 'camera' | 'gallery'
}

const MAX_EDGE = 1600
const JPEG_QUALITY = 0.72

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the image'))
    image.src = source
  })
}

async function compressBlob(
  blob: Blob,
  source: 'camera' | 'gallery'
): Promise<CapturedImage> {
  const dataUrl = await blobToDataUrl(blob)
  const image = await loadImage(dataUrl)
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not process the image')
  context.drawImage(image, 0, 0, width, height)

  const compressed = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not compress the image'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })

  return {
    blob: compressed,
    dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
    width,
    height,
    mime: 'image/jpeg',
    source
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image'))
    reader.readAsDataURL(blob)
  })
}

function pickFile(source: 'camera' | 'gallery'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if (source === 'camera') input.setAttribute('capture', 'environment')
    input.style.position = 'fixed'
    input.style.left = '-10000px'
    document.body.appendChild(input)
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0] ?? null
        input.remove()
        resolve(file)
      },
      { once: true }
    )
    input.click()
  })
}

async function captureNative(source: 'camera' | 'gallery'): Promise<CapturedImage | null> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos
  })

  const webPath = photo.webPath
  if (!webPath) return null
  const blob = await (await fetch(webPath)).blob()
  const compressed = await compressBlob(blob, source)
  return { ...compressed, path: photo.path }
}

export async function captureImage(
  source: 'camera' | 'gallery' = 'camera'
): Promise<CapturedImage | null> {
  if (Capacitor.isNativePlatform()) {
    return captureNative(source)
  }

  const file = await pickFile(source)
  if (!file) return null
  return compressBlob(file, source)
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mime })
}

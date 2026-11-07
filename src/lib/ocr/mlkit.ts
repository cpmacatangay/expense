import { OcrError, type ImageSource, type OcrLine, type OcrResult, type ReceiptOcr } from './types'

export class MlKitOcr implements ReceiptOcr {
  readonly engine = 'mlkit' as const

  async recognize(image: ImageSource): Promise<OcrResult> {
    if (!image.path) {
      throw new OcrError('ML Kit needs a local image file from the native camera.')
    }

    const startedAt = performance.now()

    try {
      const { Script, TextRecognition } = await import('@capacitor-mlkit/text-recognition')
      const result = await TextRecognition.processImage({
        path: image.path,
        script: Script.Latin
      })

      const lines: OcrLine[] = result.blocks.flatMap((block) =>
        block.lines.map((line) => {
          const box = line.boundingBox
          return {
            text: line.text.trim(),
            bbox: box
              ? {
                  x: box.left,
                  y: box.top,
                  width: box.right - box.left,
                  height: box.bottom - box.top
                }
              : { x: 0, y: 0, width: 0, height: 0 }
          }
        })
      )

      return {
        engine: 'mlkit',
        lines: lines.filter((line) => line.text.length > 0),
        rawText: result.text,
        imageWidth: image.width,
        imageHeight: image.height,
        durationMs: performance.now() - startedAt,
        warnings: result.text.trim().length === 0 ? ['No text was detected in the image.'] : []
      }
    } catch (error) {
      throw new OcrError('ML Kit could not read this image.', { cause: error })
    }
  }
}

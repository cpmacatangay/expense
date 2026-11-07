import { OcrError, type ImageSource, type OcrLine, type OcrResult, type ReceiptOcr } from './types'

export class TesseractOcr implements ReceiptOcr {
  readonly engine = 'tesseract' as const

  async recognize(image: ImageSource): Promise<OcrResult> {
    const startedAt = performance.now()

    try {
      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker('eng', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract',
        langPath: '/tessdata',
        logger: () => undefined
      })

      try {
        const { data } = await worker.recognize(image.blob)
        const lines: OcrLine[] =
          data.blocks?.flatMap((block) =>
            block.paragraphs.flatMap((paragraph) =>
              paragraph.lines.map((line) => ({
                text: line.text.trim(),
                bbox: {
                  x: line.bbox.x0,
                  y: line.bbox.y0,
                  width: line.bbox.x1 - line.bbox.x0,
                  height: line.bbox.y1 - line.bbox.y0
                },
                confidence: line.confidence / 100
              }))
            )
          ) ?? []

        return {
          engine: 'tesseract',
          lines: lines.filter((line) => line.text.length > 0),
          rawText: data.text ?? '',
          imageWidth: image.width,
          imageHeight: image.height,
          durationMs: performance.now() - startedAt,
          warnings:
            (data.text ?? '').trim().length === 0 ? ['No text was detected in the image.'] : []
        }
      } finally {
        await worker.terminate()
      }
    } catch (error) {
      throw new OcrError('On-device text recognition could not read this image.', { cause: error })
    }
  }
}

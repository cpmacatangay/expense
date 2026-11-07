import { formatCentavos } from '../../lib/money/centavos'
import type { OutingBundle } from '../../lib/types'
import { outingDateLabel } from './recap'

const WIDTH = 1080
const HEIGHT = 1350
const PAD = 72
const INK = '#1F1B16'
const MUTED = '#6F675C'
const ACCENT = '#1F5C45'
const LINE = '#E6DDCD'
const CREAM = '#FAF6EF'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const MONO = 'Menlo, Consolas, "Courier New", monospace'

function line(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(WIDTH - PAD, y)
  ctx.stroke()
  ctx.setLineDash([])
}

export async function renderRecapImage(bundle: OutingBundle): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create the recap image')

  const { outing, members, students, coverage, shares } = bundle
  const membersById = Object.fromEntries(members.map((member) => [member.id, member]))
  const studentsById = Object.fromEntries(students.map((student) => [student.id, student]))
  const payer = membersById[outing.payerId]?.name ?? '—'

  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Logo
  ctx.fillStyle = ACCENT
  ctx.beginPath()
  ctx.roundRect(PAD, PAD, 64, 64, 20)
  ctx.fill()
  ctx.fillStyle = CREAM
  ctx.font = `700 36px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText('S', PAD + 32, PAD + 45)

  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = `700 30px ${SANS}`
  ctx.fillText('Salo', PAD + 84, PAD + 30)
  ctx.fillStyle = MUTED
  ctx.font = `600 12px ${SANS}`
  ctx.fillText('MEAL LEDGER', PAD + 84, PAD + 52)

  ctx.textAlign = 'right'
  ctx.font = `400 16px ${SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText(outingDateLabel(outing.date), WIDTH - PAD, PAD + 30)

  // Place and total
  let y = 220
  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED
  ctx.font = `600 16px ${SANS}`
  ctx.fillText((outing.place || 'MEAL').toUpperCase(), PAD, y)

  y += 70
  ctx.fillStyle = INK
  ctx.font = `700 78px ${MONO}`
  ctx.fillText(formatCentavos(outing.totalCentavos), PAD, y)

  y += 44
  ctx.fillStyle = MUTED
  ctx.font = `400 18px ${SANS}`
  ctx.fillText(
    `${outing.headcount} heads · ${formatCentavos(outing.perHeadCentavos)} per head · paid by ${payer}`,
    PAD,
    y
  )

  y += 52
  line(ctx, y)
  y += 54

  // Adult rows
  for (const member of members) {
    const share = shares.find((item) => item.memberId === member.id)
    const covered = coverage
      .filter((item) => item.memberId === member.id)
      .map((item) => studentsById[item.studentId]?.name)
      .filter(Boolean)
      .join(', ')

    ctx.fillStyle = INK
    ctx.font = `700 24px ${SANS}`
    ctx.textAlign = 'left'
    ctx.fillText(member.name, PAD, y)

    ctx.fillStyle = MUTED
    ctx.font = `400 15px ${SANS}`
    ctx.fillText(`Covered ${covered || 'none'}`, PAD, y + 24)

    ctx.fillStyle = INK
    ctx.font = `700 26px ${MONO}`
    ctx.textAlign = 'right'
    ctx.fillText(formatCentavos(share?.amountCentavos ?? 0), WIDTH - PAD, y)

    y += 78
  }

  y += 8
  line(ctx, y)
  y += 58

  // Settle up
  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED
  ctx.font = `600 13px ${SANS}`
  ctx.fillText('SETTLE UP', PAD, y)
  y += 34

  const settlements = shares.filter((share) => !share.isPayer && share.amountCentavos > 0)

  if (settlements.length === 0) {
    ctx.fillStyle = ACCENT
    ctx.font = `600 19px ${SANS}`
    ctx.fillText('All settled.', PAD, y)
  } else {
    for (const share of settlements) {
      ctx.fillStyle = MUTED
      ctx.font = `400 19px ${SANS}`
      ctx.textAlign = 'left'
      ctx.fillText(`${membersById[share.memberId]?.name ?? '—'} → ${payer}`, PAD, y)

      ctx.fillStyle = INK
      ctx.font = `600 19px ${MONO}`
      ctx.textAlign = 'right'
      ctx.fillText(formatCentavos(share.amountCentavos), WIDTH - PAD, y)

      y += 34
    }
  }

  // Footer
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, HEIGHT - 92)
  ctx.lineTo(WIDTH - PAD, HEIGHT - 92)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED
  ctx.font = `400 13px ${SANS}`
  ctx.fillText('On-device receipt scan · Private group of four adults', PAD, HEIGHT - 56)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render the recap image'))),
      'image/png'
    )
  })
}

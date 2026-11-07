import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircularProgress, FilterChip, Icon, LinearProgress } from '../../components/m3'
import { useToast } from '../../components/shared/Toast'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Checkbox } from '../../components/ui/Checkbox'
import { Input, Textarea } from '../../components/ui/Input'
import { Money } from '../../components/ui/Money'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { listAllCoverage } from '../../lib/db/repositories/coverage'
import { listMembers } from '../../lib/db/repositories/members'
import {
  createFinalOuting,
  listFinalOutings
} from '../../lib/db/repositories/outings'
import { listStudents } from '../../lib/db/repositories/students'
import { formatCentavosPlain, parsePesoToCentavos } from '../../lib/money/centavos'
import { autoAssign, computeFairness, type LastCoveredMap } from '../../lib/money/fairness'
import { splitOuting, SplitValidationError, type SplitResult } from '../../lib/money/split'
import { captureImage } from '../../lib/platform/camera'
import { createOcrAdapter, parseReceipt } from '../../lib/ocr'
import type { ParsedReceipt } from '../../lib/ocr/types'
import type { OcrEngine, Student } from '../../lib/types'
import { useCurrentMemberId } from '../auth/useCurrentMember'

const STEPS = ['Details', 'Receipt', 'Students', 'Coverage', 'Review']

function safeTotal(input: string): number | null {
  try {
    const value = parsePesoToCentavos(input)
    return value > 0 ? value : null
  } catch {
    return null
  }
}

export function NewOutingPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const currentMemberId = useCurrentMemberId()

  const members = useLiveQuery(() => listMembers(), []) ?? []
  const students = useLiveQuery(() => listStudents(true), []) ?? []
  const outings = useLiveQuery(() => listFinalOutings(), []) ?? []
  const coverageRows = useLiveQuery(() => listAllCoverage(), []) ?? []

  const [step, setStep] = useState(0)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [place, setPlace] = useState('')
  const [notes, setNotes] = useState('')
  const [totalInput, setTotalInput] = useState('')
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>()
  const [ocrEngine, setOcrEngine] = useState<OcrEngine>('manual')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [presentIds, setPresentIds] = useState<string[]>([])
  const [coverage, setCoverage] = useState<Record<string, string>>({})
  const [payerId, setPayerId] = useState(currentMemberId ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!payerId && currentMemberId) setPayerId(currentMemberId)
  }, [currentMemberId, payerId])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const memberIds = members.map((member) => member.id)
  const studentsById = Object.fromEntries(students.map((student) => [student.id, student]))
  const totalCentavos = safeTotal(totalInput)

  const fairness = useMemo(
    () => computeFairness({ outings, coverage: coverageRows, memberIds }),
    [outings, coverageRows, memberIds]
  )

  const lastCoveredByStudent = useMemo<LastCoveredMap>(() => {
    const outingsById = Object.fromEntries(outings.map((outing) => [outing.id, outing]))
    const map: LastCoveredMap = {}
    for (const row of coverageRows) {
      const outing = outingsById[row.outingId]
      if (!outing) continue
      const perStudent = map[row.studentId] ?? (map[row.studentId] = {})
      if (!perStudent[row.memberId] || outing.date > perStudent[row.memberId]) {
        perStudent[row.memberId] = outing.date
      }
    }
    return map
  }, [coverageRows, outings])

  const splitPreview = useMemo<{ split?: SplitResult; error?: string }>(() => {
    if (!totalCentavos || members.length < 2) return {}
    try {
      return {
        split: splitOuting({
          totalCentavos,
          memberIds,
          presentStudentIds: presentIds,
          coverageByStudent: coverage
        })
      }
    } catch (caught) {
      return {
        error: caught instanceof SplitValidationError ? caught.issues[0] : 'Check the split'
      }
    }
  }, [coverage, memberIds, members.length, presentIds, totalCentavos])

  const assignedCount = presentIds.filter((studentId) => Boolean(coverage[studentId])).length
  const allAssigned = assignedCount === presentIds.length

  const togglePresent = (student: Student, checked: boolean) => {
    setPresentIds((current) =>
      checked ? [...current, student.id] : current.filter((id) => id !== student.id)
    )
    if (!checked) {
      setCoverage((current) => {
        const next = { ...current }
        delete next[student.id]
        return next
      })
    }
  }

  const handleScan = async () => {
    setScanError(null)
    setScanning(true)
    try {
      const image = await captureImage('camera')
      if (!image) return
      setImageDataUrl(image.dataUrl)
      const adapter = createOcrAdapter()
      const result = await adapter.recognize({
        blob: image.blob,
        dataUrl: image.dataUrl,
        path: image.path,
        width: image.width,
        height: image.height,
        mime: image.mime
      })
      const receipt = parseReceipt(result)
      setParsed(receipt)
      setOcrEngine(adapter.engine)
      if (receipt.totalCentavos) setTotalInput(formatCentavosPlain(receipt.totalCentavos))
      if (!place && receipt.merchant) setPlace(receipt.merchant)
      if (receipt.totalCentavos) {
        showToast('Receipt read. Check the total before continuing.', 'success')
      } else {
        showToast('Could not find the total. Enter it manually.', 'error')
      }
    } catch (caught) {
      setScanError(
        caught instanceof Error
          ? `${caught.message} You can enter the total manually.`
          : 'Could not read the receipt. Enter the total manually.'
      )
    } finally {
      setScanning(false)
    }
  }

  const startCoverage = () => {
    if (presentIds.length > 0 && members.length >= 2) {
      setCoverage(autoAssign(presentIds, memberIds, fairness, lastCoveredByStudent))
    } else {
      setCoverage({})
    }
    setStep(3)
  }

  const goNext = () => {
    if (step === 0) {
      if (!date) {
        showToast('Choose a date for the outing.', 'error')
        return
      }
      setStep(1)
      return
    }

    if (step === 1) {
      if (!totalCentavos) {
        showToast('Enter a valid total greater than zero.', 'error')
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      startCoverage()
      return
    }

    if (step === 3) {
      if (!allAssigned) {
        showToast('Assign every present student to one adult.', 'error')
        return
      }
      setStep(4)
    }
  }

  const goBack = () => {
    if (step === 0) {
      navigate('/')
      return
    }
    setStep((current) => Math.max(0, current - 1))
  }

  const finalize = async () => {
    if (!totalCentavos) {
      showToast('Enter a valid total.', 'error')
      return
    }
    if (!allAssigned) {
      showToast('Assign every present student before finalizing.', 'error')
      return
    }
    if (!payerId) {
      showToast('Choose who paid.', 'error')
      return
    }

    setSaving(true)
    try {
      const { outing } = await createFinalOuting({
        date,
        place,
        notes,
        payerId,
        totalCentavos,
        presentStudentIds: presentIds,
        coverageByStudent: coverage,
        receipt: {
          merchant: parsed?.merchant || place || undefined,
          receiptDate: parsed?.receiptDate || date,
          items:
            parsed?.items.map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unitPriceCentavos: item.unitPriceCentavos,
              lineTotalCentavos: item.lineTotalCentavos,
              confidence: item.confidence,
              sortOrder: index
            })) ?? [],
          rawText: parsed?.rawText,
          ocrEngine,
          parserVersion: parsed?.parserVersion,
          imageDataUrl
        }
      })
      showToast('Outing finalized', 'success')
      navigate(`/outings/${outing.id}`, { replace: true })
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not finalize the outing', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="New outing"
        subtitle={STEPS[step]}
        backTo="/"
        action={<span className="m3-label-medium text-on-surface-variant">Step {step + 1}/5</span>}
      />

      <div className="mb-5">
        <LinearProgress value={(step + 1) / STEPS.length} />
      </div>

      {step === 0 ? (
        <Card className="space-y-4">
          <Input
            type="date"
            label="Date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <Input
            label="Place (optional)"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="e.g. Manam Greenbelt"
          />
          <Textarea
            label="Notes (optional)"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything the group should remember"
          />
        </Card>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="m3-title-medium">Receipt total</h2>
                <p className="mt-1 m3-body-small text-on-surface-variant">
                  The total is the source of truth. Line items are for reference.
                </p>
              </div>
              <Icon>receipt_long</Icon>
            </div>

            <Input
              value={totalInput}
              onChange={(event) => setTotalInput(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              label="Total amount"
              prefixText="₱"
              style={
                {
                  '--md-outlined-text-field-input-text-size': '24px',
                  '--md-outlined-text-field-input-text-font': 'Roboto Mono, monospace'
                } as CSSProperties
              }
            />

            <Button
              variant="secondary"
              fullWidth
              onClick={() => void handleScan()}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <span slot="icon">
                    <CircularProgress
                      indeterminate
                      style={{ '--md-circular-progress-size': '20px' } as CSSProperties}
                    />
                  </span>
                  Reading on-device…
                </>
              ) : (
                <>
                  <span slot="icon">
                    <Icon>photo_camera</Icon>
                  </span>
                  Scan receipt
                </>
              )}
            </Button>

            {scanError ? (
              <div className="flex items-start gap-2 rounded-m3-sm border border-error/20 bg-error-container p-3 text-on-error-container">
                <Icon>warning</Icon>
                <p>{scanError}</p>
              </div>
            ) : null}
          </Card>

          {imageDataUrl ? (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="m3-title-medium">Scanned receipt</h2>
                <span className="m3-label-small uppercase tracking-[0.14em] text-on-surface-variant">
                  {ocrEngine === 'mlkit' ? 'ML Kit · on-device' : 'Tesseract · on-device'}
                </span>
              </div>
              <img
                src={imageDataUrl}
                alt="Receipt"
                className="max-h-64 w-full rounded-2xl border border-outline-variant object-contain"
              />
              {parsed ? (
                <div className="space-y-2">
                  {parsed.merchant ? (
                    <p className="text-sm">
                      <span className="text-on-surface-variant">Merchant:</span> {parsed.merchant}
                    </p>
                  ) : null}
                  {parsed.receiptDate ? (
                    <p className="text-sm">
                      <span className="text-on-surface-variant">Receipt date:</span> {parsed.receiptDate}
                    </p>
                  ) : null}
                  {parsed.warnings.map((warning) => (
                    <p
                      key={warning}
                      className="rounded-xl bg-surface-container px-3 py-2 m3-body-small text-on-surface-variant"
                    >
                      {warning}
                    </p>
                  ))}
                  {parsed.items.length > 0 ? (
                    <div className="divide-y divide-line/70 rounded-2xl border border-outline-variant bg-surface-container-lowest">
                      {parsed.items.map((item, index) => (
                        <div
                          key={`${item.description}-${index}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            {item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ''}
                            {item.description}
                          </span>
                          <Money centavos={item.lineTotalCentavos} className="shrink-0 text-xs" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="m3-body-small text-on-surface-variant">No line items were detected.</p>
                  )}
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 m3-title-medium">
                  <Icon>group</Icon>
                  Who is present?
                </h2>
                <p className="mt-1 m3-body-small text-on-surface-variant">
                  Select the students at the table. The four adults are always counted.
                </p>
              </div>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
                {presentIds.length} selected
              </span>
            </div>

            {students.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-surface-container p-4 m3-body-medium text-on-surface-variant">
                No active students. This will be an adults-only split.{' '}
                <Link to="/students" className="font-semibold text-accent">
                  Add students
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {students.map((student) => {
                  const checked = presentIds.includes(student.id)
                  return (
                    <Checkbox
                      key={student.id}
                      checked={checked}
                      onChange={(event) => togglePresent(student, event.target.checked)}
                      label={
                        <span>
                          <span className="block font-semibold">{student.name}</span>
                          {student.notes ? (
                            <span className="block m3-body-small text-on-surface-variant">{student.notes}</span>
                          ) : null}
                        </span>
                      }
                    />
                  )
                })}
              </div>
            )}

            {students.length > 0 ? (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPresentIds(students.map((student) => student.id))}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPresentIds([])
                    setCoverage({})
                  }}
                >
                  Clear
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m3-title-medium">Who covers whom?</h2>
                <p className="mt-1 m3-body-small text-on-surface-variant">
                  One adult per student. The app suggests the fairest split.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (presentIds.length > 0) {
                    setCoverage(autoAssign(presentIds, memberIds, fairness, lastCoveredByStudent))
                    showToast('Coverage balanced', 'success')
                  }
                }}
              >
                <span slot="icon">
                  <Icon>auto_awesome</Icon>
                </span>
                Auto-balance
              </Button>
            </div>

            {presentIds.length === 0 ? (
              <p className="rounded-2xl bg-surface-container p-4 m3-body-medium text-on-surface-variant">
                No students are present. The bill will split across the four adults.
              </p>
            ) : (
              <div className="space-y-3">
                {presentIds.map((studentId) => {
                  const student = studentsById[studentId]
                  const assigned = coverage[studentId]
                  return (
                    <div key={studentId} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="m3-title-medium">{student?.name ?? 'Student'}</span>
                        {assigned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                            <Icon style={{ '--md-icon-size': '16px' } as CSSProperties}>check</Icon>
                            Covered
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
                            Unassigned
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {members.map((member) => (
                          <FilterChip
                            key={member.id}
                            label={member.name}
                            selected={assigned === member.id}
                            className="w-full"
                            onClick={() =>
                              setCoverage((current) => ({ ...current, [studentId]: member.id }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="m3-title-medium">Live split</h2>
            <div className="mt-3 space-y-2">
              {members.map((member) => {
                const share = splitPreview.split?.shares.find(
                  (item) => item.memberId === member.id
                )
                const count = presentIds.filter(
                  (studentId) => coverage[studentId] === member.id
                ).length
                return (
                  <div key={member.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Avatar name={member.name} order={member.order} size="sm" />
                      <span>
                        {member.name}
                        <span className="ml-1 m3-body-small text-on-surface-variant">
                          · {count} {count === 1 ? 'student' : 'students'}
                        </span>
                      </span>
                    </span>
                    {share ? (
                      <Money centavos={share.amountCentavos} className="font-semibold" />
                    ) : (
                      <span className="m3-body-small text-on-surface-variant">—</span>
                    )}
                  </div>
                )
              })}
            </div>
            {splitPreview.error ? (
              <p className="mt-2 text-xs text-error">{splitPreview.error}</p>
            ) : null}
          </Card>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <Card variant="primary">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="m3-label-medium uppercase tracking-[0.14em] text-on-primary-container/70">
                  Total
                </p>
                <Money
                  centavos={totalCentavos ?? 0}
                  size="xl"
                  className="mt-1 block text-on-primary-container"
                />
                <p className="m3-body-small mt-1 text-on-primary-container/70">
                  {(splitPreview.split?.headcount ?? members.length)} heads ·{' '}
                  {splitPreview.split
                    ? `₱${formatCentavosPlain(splitPreview.split.perHeadCentavos)} per head`
                    : '—'}
                </p>
              </div>
              <div className="rounded-full bg-on-primary-container/10 p-3">
                <Icon>receipt_long</Icon>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {members.map((member) => {
                const share = splitPreview.split?.shares.find(
                  (item) => item.memberId === member.id
                )
                return (
                  <div key={member.id} className="m3-body-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Avatar name={member.name} order={member.order} size="sm" />
                      <span>
                        {member.name}
                        <span className="ml-1 m3-body-small text-on-primary-container/70">
                          · self + {share?.coveredStudents ?? 0}
                        </span>
                      </span>
                    </span>
                    <Money centavos={share?.amountCentavos ?? 0} className="font-medium" />
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
                Who paid?
              </span>
              <Select
                value={payerId}
                onChange={(event) => setPayerId(event.target.value)}
                placeholder="Choose an adult"
                options={members.map((member) => ({
                  value: member.id,
                  label: member.name
                }))}
              />
            </label>

            {splitPreview.error ? (
              <p className="rounded-m3-sm bg-tertiary-container px-3 py-2 text-xs text-on-tertiary-container">
                {splitPreview.error}
              </p>
            ) : null}

            <p className="m3-body-small leading-relaxed text-on-surface-variant">
              Finalizing locks the split. You can still record settlements from the ledger.
            </p>
          </Card>
        </div>
      ) : null}

      <div className="mt-5 flex gap-2">
        <Button variant="ghost" onClick={goBack} disabled={saving}>
          <span slot="icon">
            <Icon>arrow_back</Icon>
          </span>
          Back
        </Button>
        {step < 4 ? (
          <Button fullWidth onClick={goNext} disabled={saving}>
            Next
            <span slot="icon">
              <Icon>arrow_forward</Icon>
            </span>
          </Button>
        ) : (
          <Button fullWidth onClick={() => void finalize()} disabled={saving || !allAssigned}>
            <span slot="icon">
              {saving ? (
                <CircularProgress
                  indeterminate
                  style={{ '--md-circular-progress-size': '20px' } as CSSProperties}
                />
              ) : (
                <Icon>check</Icon>
              )}
            </span>
            {saving ? 'Finalizing…' : 'Finalize outing'}
          </Button>
        )}
      </div>
    </div>
  )
}

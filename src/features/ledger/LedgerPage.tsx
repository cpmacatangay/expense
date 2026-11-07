import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { useState } from 'react'
import { Icon } from '../../components/m3'
import { useToast } from '../../components/shared/Toast'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Money } from '../../components/ui/Money'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { listMembers } from '../../lib/db/repositories/members'
import { listFinalOutings } from '../../lib/db/repositories/outings'
import {
  listSettlements,
  recordSettlement,
  voidSettlement
} from '../../lib/db/repositories/settlements'
import { listAllShares } from '../../lib/db/repositories/shares'
import { parsePesoToCentavos } from '../../lib/money/centavos'
import { computeBalances, suggestSettlements } from '../../lib/money/settle-up'
import type { Member, Settlement, Transfer } from '../../lib/types'
import { settlementSchema } from '../../lib/validation/schemas'
import { useCurrentMemberId } from '../auth/useCurrentMember'

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  members: Member[]
  initial: Transfer | null
}

function PaymentDialog({ open, onClose, onSaved, members, initial }: PaymentDialogProps) {
  const { showToast } = useToast()
  const [from, setFrom] = useState(initial?.fromMemberId ?? '')
  const [to, setTo] = useState(initial?.toMemberId ?? '')
  const [amount, setAmount] = useState(
    initial ? (initial.amountCentavos / 100).toFixed(2) : ''
  )
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    const parsed = settlementSchema.safeParse({ fromMemberId: from, toMemberId: to, amount, date, note })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the payment details')
      return
    }

    setSaving(true)
    try {
      await recordSettlement({
        fromMemberId: parsed.data.fromMemberId,
        toMemberId: parsed.data.toMemberId,
        amountCentavos: parsePesoToCentavos(parsed.data.amount),
        date: parsed.data.date,
        note: parsed.data.note
      })
      showToast('Payment recorded', 'success')
      onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not record the payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record a payment"
      description="Settlements carry forward until the ledger is balanced."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Saving…' : 'Record payment'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
            From
          </span>
          <Select
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            placeholder="Who paid?"
            options={members.map((member) => ({ value: member.id, label: member.name }))}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
            To
          </span>
          <Select
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="Who received?"
            options={members.map((member) => ({ value: member.id, label: member.name }))}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
            Amount
          </span>
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
            Date
          </span>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
            Note · optional
          </span>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="GCash, cash, etc."
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Dialog>
  )
}

export function LedgerPage() {
  const currentMemberId = useCurrentMemberId()
  const { showToast } = useToast()
  const members = useLiveQuery(() => listMembers(), []) ?? []
  const outings = useLiveQuery(() => listFinalOutings(), []) ?? []
  const shares = useLiveQuery(() => listAllShares(), []) ?? []
  const settlements = useLiveQuery(() => listSettlements(), []) ?? []

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentKey, setPaymentKey] = useState(0)
  const [initialTransfer, setInitialTransfer] = useState<Transfer | null>(null)

  const memberIds = members.map((member) => member.id)
  const membersById = Object.fromEntries(members.map((member) => [member.id, member]))
  const balances = computeBalances({ outings, shares, settlements, memberIds })
  const transfers = suggestSettlements(balances)

  const openPayment = (transfer: Transfer | null) => {
    setInitialTransfer(transfer)
    setPaymentKey((key) => key + 1)
    setPaymentOpen(true)
  }

  const handleVoid = async (settlement: Settlement) => {
    if (!window.confirm('Void this payment? The balance will be recalculated.')) return
    await voidSettlement(settlement.id)
    showToast('Payment voided', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Ledger"
        subtitle="Balances carry over until you settle."
        action={
          <Button size="sm" onClick={() => openPayment(null)} disabled={members.length < 2}>
            <span slot="icon">
              <Icon>payments</Icon>
            </span>
            Payment
          </Button>
        }
      />

      <Card className="space-y-3">
        <h2 className="m3-title-medium">Net balances</h2>
        {balances.map((balance) => {
          const member = membersById[balance.memberId]
          const isMe = balance.memberId === currentMemberId
          return (
            <div key={balance.memberId} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Avatar name={member?.name ?? '?'} order={member?.order} size="sm" />
                <span className="text-sm">
                  {member?.name ?? '—'}
                  {isMe ? <span className="ml-1 m3-body-small text-on-surface-variant">(you)</span> : null}
                </span>
              </span>
              <span className="text-right">
                <Money
                  centavos={Math.abs(balance.netCentavos)}
                  className={`font-semibold ${
                    balance.netCentavos > 0
                      ? 'text-accent'
                      : balance.netCentavos < 0
                        ? 'text-error'
                        : 'text-on-surface-variant'
                  }`}
                />
                <span className="block text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                  {balance.netCentavos > 0
                    ? 'is owed'
                    : balance.netCentavos < 0
                      ? 'owes'
                      : 'settled'}
                </span>
              </span>
            </div>
          )
        })}
      </Card>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="m3-title-medium">Suggested transfers</h2>
          <span className="m3-body-small text-on-surface-variant">{transfers.length}</span>
        </div>
        {transfers.length === 0 ? (
          <p className="mt-3 m3-body-medium text-on-surface-variant">All settled. Nothing to transfer.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {transfers.map((transfer) => (
              <div
                key={`${transfer.fromMemberId}-${transfer.toMemberId}`}
                className="flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5"
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
                  <span className="font-semibold">
                    {membersById[transfer.fromMemberId]?.name ?? '—'}
                  </span>
                  <Icon>arrow_forward</Icon>
                  <span className="font-semibold">
                    {membersById[transfer.toMemberId]?.name ?? '—'}
                  </span>
                </span>
                <Money centavos={transfer.amountCentavos} className="m3-title-small" />
                <Button size="sm" variant="ghost" onClick={() => openPayment(transfer)}>
                  Record
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="m3-title-medium">Payment history</h2>
        <span className="m3-body-small text-on-surface-variant">{settlements.length}</span>
      </div>

      {settlements.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={<Icon>account_balance_wallet</Icon>}
            title="No payments yet"
            description="Record a transfer when someone actually pays. Partial payments are fine."
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {settlements.map((settlement) => (
            <Card key={settlement.id} className="!p-3">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block m3-title-small">
                    {membersById[settlement.fromMemberId]?.name ?? '—'} →{' '}
                    {membersById[settlement.toMemberId]?.name ?? '—'}
                  </span>
                  <span className="mt-0.5 block m3-body-small text-on-surface-variant">
                    {format(new Date(`${settlement.date}T00:00:00`), 'MMM d, yyyy')}
                    {settlement.note ? ` · ${settlement.note}` : ''}
                    {settlement.voidedAt ? ' · voided' : ''}
                  </span>
                </span>
                <span className={`text-right ${settlement.voidedAt ? 'opacity-50' : ''}`}>
                  <Money centavos={settlement.amountCentavos} className="block m3-title-small" />
                  {!settlement.voidedAt ? (
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => void handleVoid(settlement)}
                    >
                      <span slot="icon">
                        <Icon>undo</Icon>
                      </span>
                      Void
                    </Button>
                  ) : null}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PaymentDialog
        key={paymentKey}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSaved={() => setPaymentOpen(false)}
        members={members}
        initial={initialTransfer}
      />
    </div>
  )
}

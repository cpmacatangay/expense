# Contract: Settlements

**Feature**: `002-salo-pwa` | **Consumers**: Ledger, Activity, finalization, tests

## Purpose

A settlement records a real payment between two adults. It is not a suggestion; it becomes part of the
confirmed ledger only after the recipient confirms it.

## State Machine

```text
pending ──confirm──→ confirmed
   │                    │
   ├──decline──→ declined
   │                    │
   └──void─────→ void ←─┘
```

- `pending`: recorded, awaiting the recipient.
- `confirmed`: accepted; affects balances.
- `declined`: rejected with a note; does not affect balances.
- `void`: cancelled by the payer or owner; does not affect balances.

Allowed transitions:
- `pending → confirmed` by the recipient.
- `pending → declined` by the recipient, with a required reason.
- `pending → void` by the payer or owner.
- `declined → void` by the payer or owner.
- `confirmed → void` by the payer or owner; the balance reverts and an activity event records why.

No other transitions are allowed. A declined settlement cannot later be confirmed; the payer must
record a new settlement. A pending settlement may be edited by the payer before the recipient
decides.

## Recording

**Who**:
- The payer records their own payment.
- The owner may record for a pending adult.
- A member cannot record for another active adult.

**Fields**:
- `fromAdultId` (payer), `toAdultId` (payee).
- `amountCentavos` > 0.
- `date` in Asia/Manila.
- Optional note, maximum 500 characters.

**Validation**:
- Payer and payee are different active or pending adults in the group.
- Both are group adults; no cross-group settlement.
- The amount does not exceed the confirmed outstanding balance between the two adults minus any other
  pending settlements from the same payer to the same payee.
- The payer has not already recorded an identical pending settlement (same payer, payee, amount, and
  date); the client warns before allowing a duplicate.

## Confirmation

**Recipient only**:
- The recipient sees the payer, amount, date, and note.
- Confirm: status becomes `confirmed`; balances update exactly.
- Decline: status becomes `declined`; a reason is required; balances do not change.

**Pending adult recipient**:
- If the recipient is pending, the settlement remains `pending` until they join.
- Once they join, they can confirm or decline.

## Balances

```text
paid = sum of finalized outings where the adult is payer
owed = sum of finalized shares for the adult
confirmedOut = sum of confirmed settlements from the adult
confirmedIn = sum of confirmed settlements to the adult
net = paid - owed + confirmedOut - confirmedIn
```

- Only finalized outings and confirmed settlements are included.
- Pending, declined, and void settlements are excluded.
- The UI shows pending amounts separately from the confirmed net.
- Pairwise suggestions use the net balances and settle the group to zero.

## Permissions

| Action | Payer | Payee | Owner | Other member |
|---|---|---|---|---|
| Record own settlement | yes | no | yes for pending adult | no |
| Record for pending adult | — | — | yes | no |
| Confirm | no | yes | no | no |
| Decline | no | yes | no | no |
| Void pending/declined | yes | no | yes | no |
| Void confirmed | yes | no | yes | no |
| Read history | yes | yes | yes | yes |

## Activity

Each transition writes an activity event:
- recorded (actor, payer, payee, amount, date);
- confirmed (actor, recipient);
- declined (actor, reason);
- voided (actor, reason, previous status).

## Edge Cases

- Amount exceeds the outstanding balance: blocked.
- Payer equals payee: blocked.
- Settlement in a group the caller does not belong to: denied.
- Recipient is removed: they can no longer confirm; the owner may void the pending settlement.
- Payer is removed: the owner may void; history remains.
- Duplicate pending settlement: warn; allow only after explicit confirmation.
- Confirmed settlement is voided: balance reverts; both sides see the activity event.
- Group archived: no new settlements; history remains readable to the owner.

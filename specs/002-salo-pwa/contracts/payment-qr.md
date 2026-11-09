# Contract: Payment QR

**Feature**: `002-salo-pwa` | **Consumers**: Home, Ledger, Outing Detail, Members, Settings

## Purpose

A payment QR lets a member scan the payee's GCash, Maya, or bank code with their own banking app. It
is a convenience, not a payment integration. Salo never scans the code, never moves money, and never
changes the settlement state machine.

Terminology: the member who paid the bill is owed money, so they are the **payee** in the settlement.
Their QR is shown to the members who owe them.

## Ownership

- One primary payment QR per **group adult identity**.
- An active adult manages their own QR.
- The owner manages a pending adult's QR.
- A soft-removed adult's QR is deleted and no longer served.
- The QR is group-scoped: the same person may have different QRs in different groups.

## Upload and Replace

- The owner or adult selects a PNG or JPEG image.
- Maximum size: 2 MB.
- EXIF and unnecessary metadata are stripped.
- The image is stored at `{group_id}/{adult_id}/qr` in the private `payment-qrs` bucket.
- Replacing overwrites the object and updates `payment_qr_updated_at`.
- Removing clears the path and deletes the object.
- Invalid type, oversized image, or failed upload returns a readable error and leaves the previous QR
  intact.

## Access

- Only active members of the group may request a signed URL.
- Signed URLs expire within 5 minutes.
- Public URLs, direct bucket access, and cross-group access are denied.
- A pending adult cannot request a URL because they have no session; the owner and members can.
- A removed adult cannot request or be served a URL.
- The image path and label are excluded from exports, recaps, and activity payloads.

## Display

The pay sheet shows:

- The payee's name and QR label.
- The amount owed, if opened from a specific debt.
- The QR on a white, high-contrast card at a scannable size.
- A short line: "Scan with your GCash, Maya, or bank app."
- A "Record payment" action so the member can record the settlement after paying.

Entry points:

- Home balance card and debt rows. With one creditor, "Pay" opens that QR; with several, it opens the
  Ledger debt list.
- Ledger who-owes-whom rows and settlement sheet.
- Finalized outing detail, for the payer.

Not included:

- Recaps, text or image.
- Exports.
- Invites.
- Any public page.

## Missing QR

- The sheet says: "Ask <payee> for their payment QR."
- The member can still record the settlement.
- The owner can add a QR for a pending adult from the member sheet.
- The pay action stays available; it does not disappear.

## Offline

- A signed URL is fetched when the sheet opens.
- Offline: "Connect to view this payment QR." The rest of the ledger remains readable.
- The QR image is not cached in IndexedDB.

## Scanning

- Salo displays the QR; it does not open the camera.
- The member scans with their banking app.
- Returning to Salo does not auto-record or auto-confirm anything.
- The payer records the settlement; the recipient confirms it.

## Accessibility

- The QR image has an accessible name: "<Payee> payment QR, <label>."
- The sheet is reachable by keyboard and screen reader.
- The code is displayed with sufficient contrast and size; a manual bank-app scan is part of device
  acceptance.
- The amount and payee are read before the image.

## Errors

| Error | Behavior |
|---|---|
| Unsupported file | Reject with PNG/JPEG guidance; keep the old QR |
| Over 2 MB | Reject with the limit; keep the old QR |
| Upload failed | Keep the old QR; retry |
| Signed URL expired | Fetch a new URL when the sheet opens |
| No connection | Show the connect message; no cached image |
| Removed adult | Deny the URL; hide the pay action |
| No QR | Show the ask-the-payee fallback |

# Salo PWA — iPhone design prototype

Static, high-fidelity prototype for the iPhone shell. It is not wired to Supabase and not the
production PWA. Its job is to settle the visual direction and the screen composition before the real
client is built.

## Run

From the repository root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/design/pwa-prototype/index.html
```

Screens can be opened directly:

```text
?screen=home
?screen=ledger
?screen=activity
?screen=settings
?screen=outing
?screen=new
?screen=draft
&sheet=pay
```

The pay-QR sheet is a modal over the Ledger: `?screen=ledger&sheet=pay`.

## Committed direction

- **Style**: Achromatic ledger, adapted (seed `476852879`).
- **Face**: warm sage-stone ground `#F2F4F0`, near-white surfaces `#FCFDFB`, ink figures, Ledger
  Green `#1F5C45` as the one hue, red `#A83232` for "you owe."
- **Type**: SF Pro via the Apple system stack; 28px large title; 40px balance; tabular figures.
- **Signature**: the shared table — member initials clustered on Home and repeated through the split.
- **Shell**: iPhone bottom tabs; no desktop sidebar. Reason: the product is iPhone-first and the
  brief chooses four bottom tabs.
- **No action tiles**: one balance card, pending actions, recent outings, and one primary action.
- **No gradients, glass, or card shadows** outside the sheet overlay. Depth is a 1px line or a tone
  step.
- **Motion**: quiet; the sheet is the only animated surface.

The full style sheet is in `direction.json`.

## Screens

| Screen | Question it answers first |
|---|---|
| Home | What do I owe, and what needs me? |
| Ledger | Who owes whom, and how do I pay? |
| Outing detail | What was the bill, and what is my share? |
| Activity | What changed in this group? |
| Settings | Who is in the group, and how do I pay or export? |
| Draft | What is waiting to be published? |
| Pay QR sheet | How do I pay this person? |
| New outing | What did we eat, who was there, and what is the total? |

## Data

The prototype uses one consistent dataset:

- CP owes **₱819.00**: ₱334.00 to Mai and ₱485.00 to Kent.
- Net balances: CP −₱819.00, Mai +₱766.00, Kent +₱1,015.00, Llanmer −₱962.00, sum zero.
- Transfers: CP→Mai ₱334, CP→Kent ₱485, Llanmer→Mai ₱392, Llanmer→Kent ₱570, Kent→Mai ₱40.
- McDo Il Corso total **₱825.00**; items 220 + 110 + 165 + 132 + 198 = 825; shares 451 + 308 + 33
  + 33 = 825.
- Jollibee draft total **₱1,240.00**; items 300 + 280 + 260 + 220 + 180 = 1,240.
- Payment QRs are **demo patterns**, clearly labelled; they are not real payment codes.

## Known limits

- Static HTML/CSS/JS; no auth, database, realtime, or real QR upload.
- The pay QR is a placeholder; the production app stores a private uploaded image.
- The Android Material 3 shell is not built in this prototype.
- The inspector treats the modal pay sheet as covering the underlying page; that is expected for a
  dialog. The five main screens pass the app-screen checks.

# Salo PWA — Android Material 3 prototype

Static, high-fidelity prototype for the Android shell. Same data and screens as the iPhone prototype,
rendered as Material 3 rather than an iOS app. Not wired to Supabase and not the production PWA.

## Run

From the repository root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/design/pwa-prototype-android/index.html
```

Screens:

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

## Material 3 decisions

- **Shell**: Salo wordmark and group chip in a small top app bar; 28px page title below; four-item
  navigation bar with a 64×32 active indicator pill.
- **Surface**: `#F7FAF5` page, `#FFFFFF` outlined cards, 12px radius, 1px `#E1E8DE` outline, no
  shadows. The sheet is the only elevated surface.
- **Money state**: the balance is an **error container** card `#F9DEDC` with `#410E0B` text for "you
  owe"; the Pay action is a white pill. Positive states use the green secondary container.
- **Action**: filled green button, 48px high, 20px radius; text buttons 14/20 medium; chips 8px radius.
- **Type**: Roboto 400/500; 28/36 page title; 36/44 balance; 16/24 row titles; 14/20 body; 12/16
  labels.
- **Inputs**: 56px outlined fields with 4px radius; 8px filter-chip person selectors; 52×32 Material
  switches.
- **Feed**: 3px active tab indicator; short status chips for pending, confirmed, private, audit.
- **Sheet**: 28px top radius, drag handle, tonal sheet surface, white QR card.

## Screens

| Screen | What it answers |
|---|---|
| Home | What do I owe, and what needs me? |
| Ledger | Who owes whom, and how do I pay? |
| Outing detail | What was the bill, and what is my share? |
| Activity | What changed in this group? |
| Settings | Group, payment QR, members, students, appearance, export, account |
| Draft | What is waiting to be published? |
| New outing | Present adults, covered students, items, and the sticky item-sum total |
| Pay QR sheet | How do I pay this person? |

## Checks

The app-screen inspector passes at **360px and 412px** for Home, Ledger, Outing, and Settings, and at
390px for the full-height Activity screen. The pay sheet is a real modal; the inspector flags the
underlying page title as covered, which is expected for a dialog.

## Known limits

- Static data; no auth, database, realtime, or real QR upload.
- Demo QR patterns, labelled as such.
- The iPhone shell is the separate prototype at `design/pwa-prototype/`.
- Dark mode is specified in `DESIGN.md` but not built in this prototype.

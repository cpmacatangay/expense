# Device test record — 2026-11-07

Device: Samsung `SM-S948B`, Android 17 (API 37), One UI 9.0 (`ro.build.version.oneui=90000`),
arm64-v8a, serial `R5GL24MBAQW`. Debug APK installed with `adb install -r`.

## Results

| Area | Result |
| --- | --- |
| Cold start | 416 ms (`am start -W` TotalTime) |
| Launch stability | No crash after first-run fix |
| Adult profiles | CP / Mai / Kent / Llanmer seeded, switcher works |
| Students | Added Ana and Ben, archived count correct |
| New Outing wizard | 4 steps, validation, item add/edit/assign |
| Item assignment | Adult, Student, and Shared all persist |
| Shared split | ₱825 total, 6 heads |
| Exact split | CP ₱451.00, Mai ₱308.00, Kent ₱33.00, Llanmer ₱33.00 (sums to ₱825.00) |
| Coverage | Ana → CP, Ben → Mai |
| Finalize | Locks the split, writes shares, opens detail |
| Detail screen | Totals, split, coverage, items, settlements |
| Recap text | Share sheet shows "Salo — Test Meal — 2026-11-07" |
| Recap image | 1080×1350 PNG renders with all amounts; shared as `image/png` |
| Ledger | Balances, suggested transfers, partial payment, void |
| History | Total spend ₱825, per-student Ana ₱150 / Ben ₱120 |
| CSV export | `salo-ledger.csv` written through SAF, exact centavos |
| Google sign-in | Credential Manager → Supabase ID-token exchange, `[redacted-email]` |
| Owner gate | Auth user created with `provider = google` |
| Backup | Snapshot row in `ledger_snapshots`, payload place "Test Meal", total 82500 |
| Restore | Clear local data → restore → outing, shares, students, and voided payment return |

## Bug found and fixed

`SaloApp.kt` — `SaloDestination.main` was a `companion object` initializer inside the sealed class,
so the `data object` destinations were observed as `null` during class initialization and the app
crashed with `NullPointerException ... getRoute() on a null object reference` on every launch.
Moved the list to a file-level `val` (commit `892697d`).

## Not yet covered on device

- OCR/camera capture against a real receipt (needs a physical receipt in front of the lens).
- Light theme / dynamic color fallback (only dark theme verified).
- Offline creation and WorkManager backup retry (T125).
- Release build with a real keystore.

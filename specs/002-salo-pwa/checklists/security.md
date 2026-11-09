# Security & Money Checklist: Salo Shared PWA

**Purpose**: Validate the requirements quality for access control, authentication, invitations, money,
settlements, privacy, and recovery before implementation.
**Created**: 2026-11-09
**Feature**: [spec.md](../spec.md)

**Note**: This is a reviewer-owned requirements-quality checklist. `[x]` means the reviewer has
confirmed the requirement criterion is satisfied; it does not mean implementation is complete.

## Access Control & RLS

- [ ] CHK001 Are row-level access requirements defined for every group-scoped table? [Completeness, Spec §FR-101]
- [ ] CHK002 Is cross-group denial specified for every read and write path, including exports and realtime? [Coverage, Spec §FR-020, §FR-101]
- [ ] CHK003 Are owner-only actions explicitly enumerated and separated from member actions? [Clarity, Spec §FR-030, §FR-058, §FR-059]
- [ ] CHK004 Is the pending-adult restriction quantified: no sign-in, no reads, no settlement confirmation? [Clarity, Spec §FR-028]
- [ ] CHK005 Is the soft-removed member's access denied while history remains readable to active members? [Consistency, Spec §FR-031]
- [ ] CHK006 Are private-draft visibility rules explicit for the author, owner, and other members? [Clarity, Spec §FR-061, §FR-062]
- [ ] CHK007 Is the service-role key explicitly excluded from the client and confined to server-side operations? [Completeness, Spec §FR-102]

## Authentication & Invitations

- [ ] CHK008 Are all supported sign-in methods and the explicit absence of Apple sign-in documented? [Completeness, Spec §FR-012]
- [ ] CHK009 Is redirect-based OAuth with PKCE required, and are popups ruled out? [Clarity, Spec §FR-013]
- [ ] CHK010 Are session expiry, refresh, and sign-out requirements specified? [Coverage, Spec §FR-016, §FR-018]
- [ ] CHK011 Is the invitation bound to exactly one pending adult and one group? [Consistency, Spec §FR-025, §FR-027]
- [ ] CHK012 Are invitation expiry, revocation, and rate limiting quantified? [Measurability, Spec §FR-026, §FR-103]
- [ ] CHK013 Is invitation acceptance idempotent and capacity-checked? [Coverage, Spec §FR-027; Contract auth-and-groups]
- [ ] CHK014 Is account deletion blocked while the user owns an active or archived group, with a transfer/delete path? [Consistency, Spec §FR-017, §FR-109]

## Money & Settlements

- [ ] CHK015 Is "present adults plus present students" defined consistently for shared items and the per-head fallback? [Consistency, Spec §FR-044, §FR-053, §FR-054]
- [ ] CHK016 Is the payer required to be present, and is the one-payer rule unambiguous? [Clarity, Spec §FR-045]
- [ ] CHK017 Are the exact-total invariant and rounding rule stated for every finalized split? [Measurability, Spec §SC-005; Contract money-engine]
- [ ] CHK018 Are Auto, Manual, and Fixed total modes fully specified, including item-change behavior? [Completeness, Spec §FR-048–§FR-051]
- [ ] CHK019 Is the settlement state machine complete: pending, confirmed, declined, void and allowed transitions? [Completeness, Contract settlements]
- [ ] CHK020 Is the overpayment rule explicit about confirmed balance minus other pending settlements? [Consistency, Spec §FR-073; Contract settlements]
- [ ] CHK021 Are duplicate-settlement warnings and self-payment blocks defined? [Coverage, Spec §FR-073, §FR-074]
- [ ] CHK022 Is pending-adult settlement confirmation explicitly deferred until the adult joins? [Clarity, Spec §FR-071]
- [ ] CHK023 Are void and decline effects on balances stated, with append-only history? [Consistency, Spec §FR-070, §FR-072, §FR-076]

## Privacy & Data Lifecycle

- [ ] CHK024 Is student data limited to display name and optional notes, with no contact details or photos? [Completeness, Spec §FR-104]
- [ ] CHK025 Is the absence of receipt images, OCR, LLM, analytics, and ad SDKs explicit? [Completeness, Spec §FR-105, §FR-106, §SC-016]
- [ ] CHK026 Are owner-full and member-scoped export permissions unambiguous? [Clarity, Spec §FR-086, §FR-087, §FR-107]
- [ ] CHK027 Is the 30-day soft-delete retention and restore window quantified? [Measurability, Spec §FR-108]
- [ ] CHK028 Are group archive and soft-delete access consequences specified for members and the owner? [Coverage, Spec §FR-033]

## Sync, PWA, and Recovery

- [ ] CHK029 Is online shared editing separated from offline reads and private drafts without ambiguity? [Consistency, Spec §FR-063]
- [ ] CHK030 Is stale-write rejection specified with the member's recovery path? [Coverage, Spec §FR-060, §FR-096]
- [ ] CHK031 Is publish idempotency specified to prevent duplicate outings on retry? [Coverage, Spec §FR-064, §FR-098]
- [ ] CHK032 Is local-storage eviction handled without claiming local drafts are recoverable from the server? [Edge Case, Spec §FR-100]
- [ ] CHK033 Are install guidance and the browser-only fallback specified for iPhone and Android? [Completeness, Spec §FR-010]
- [ ] CHK034 Is the platform shell override required to change appearance only, never data or permissions? [Consistency, Spec §FR-004, §FR-005]
- [ ] CHK035 Are sensitive activity events required to include actor and before/after values? [Completeness, Spec §FR-083, §FR-110]
- [ ] CHK036 Is the owner-offline finalization state explained to members? [Coverage, Spec Edge Cases; DESIGN §6]

## Notes

- Items left unchecked require reviewer evaluation before implementation.
- The checklist intentionally asks about requirement quality, not implementation behavior.
- Traceability references point to the spec, contracts, and design sections that own the requirement.

# Specification Quality Checklist: Salo Friends Expense Ledger

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validation run 5: remediation applied after analysis. Responsive verification now covers
  360/390/412/430/1440; US1 uses three existing accounts; the task list adds performance,
  property-based, profile-trigger, legacy-test, and ordering fixes.
- Validation run 4: all items pass. Sign-in is Google-only with self-service sign-up; a new email
  becomes a pending person with a copyable invite link sent in chat, and no authentication or invite
  email is sent. Existing Google accounts link immediately.
- Validation run 3: the seven remaining product gaps are decided: All expenses is reached from Home;
  items are a name and amount; old payment QR images are not carried over; Settings People can view,
  create an invite link, and correct a pending email; participants see names only; a deleted expense
  is removed and cannot be reopened; the wipe happens at release after a verified backup and sign-off.
- Run 2 removed the shared-item option. Every line belongs to one person; a split dish is entered as
  one line per person. This removes equal-division rounding from the money rules and leaves exact
  per-line amounts.
- **Constitution status**: amended to v6.0.0 before planning. The old group, student, owner
  finalization, and recipient-confirmation principles are replaced by the participant-only model;
  authentication is Google-only with no email delivery.
- **Rollout gate**: FR-109 discards old ledger data and QR images at release. A fresh verified
  production backup and explicit sign-off are required before that migration is written or run.
- 121 functional requirements, 8 prioritized user stories, 17 measurable outcomes. No open
  clarifications.
- Remaining working assumptions, recorded in the spec rather than left open: invites expire after 7
  days; account deletion requires a zero net balance in both directions; an active person may mark a
  debt paid while the other is pending; edits and deletes that touch a paid pair warn the editor.

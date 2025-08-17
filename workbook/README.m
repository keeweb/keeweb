# KeeWeb Reverse-Engineering Workbook

Goal  
High‑fidelity functional and architectural documentation sufficient to re‑implement a close equivalent of KeeWeb (feature + data + behavior) without access to the original repository.

Scope  
Plain English plus precise, testable specifications: data models, flows, algorithms, security parameters, performance budgets, acceptance criteria, risks.

## Structure

- `00_product/overview.md` — product positioning, user personas, glossary seed, global non‑goals.
- `10_features/core.md` — CRUD flows (vault, group, entry), search, tags, history, shortcuts, table view.
- `10_features/security.md` — crypto model, key derivation, protected data lifecycle, generator, integrity.
- `10_features/sync.md` — storage adapters, sync protocol, merge/conflict resolution, offline cache.
- `10_features/ui.md` — UI composition, interaction patterns, accessibility, theming.
- `20_architecture/system.md` — layered architecture, module boundaries, events/state machines, runtime differences.
- `30_code/repo-map.md` — (Abstracted) module map & entrypoints (implementation‑agnostic).
- `40_build/pipeline.md` — build + packaging pipeline, environment, signing, update channel.
- `95_stack/current.md` — original stack reference & constraints (legacy baseline).
- `95_stack/options.md` — modernization options with decision criteria.
- `99_modernization/roadmap.md` — phased execution plan with measurable exit criteria.

Each file:
- Starts with an Audit (historic gaps, now addressed).
- Provides What / Why / How.
- Lists Acceptance Criteria.
- Lists Non‑Goals & Risks (scoped to its topic).
- Uses consistent terminology (see glossary).

## Conventions

Terminology (canonical): Vault, Group, Entry, Field, Tag, Adapter, Merge, Protected Value, Keyfile, Plugin, Service Worker, Auto‑type.  
Time format: ISO 8601 UTC (`2025-08-17T12:34:56Z`).  
Size units: KiB (1024).  
Hash notation: hex lowercase.

## Cross‑File Linking

Use relative links (`../10_features/security.md`) to avoid duplication; prefer referencing over copying. Glossary lives in `20_architecture/system.md#glossary`.

## Change Control

Edits must preserve acceptance criteria integrity. When updating:  
1. Amend Audit section (add new gaps).  
2. Update related files’ cross-links if new terms introduced.  
3. Re‑evaluate risks.

## Completion Status

All topic files populated; iterative refinements tracked in their Audits.

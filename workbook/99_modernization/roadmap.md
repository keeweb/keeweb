# Modernization roadmap

## Audit (gaps → resolved)

- Missing measurable exit criteria per phase (expanded).
- No rollback specifics per phase → added.
- Risk tracking generic → phase-specific.

## Phases (Revised)

| Phase | Goal | Key Deliverables | Exit Criteria |
|-------|------|------------------|---------------|
| 0 | Baseline metrics | Metric script, snapshots | All metrics captured, tag created |
| 1 | Build simplification | NPM scripts, removed Grunt | Build hash parity, ≥10% time reduction |
| 2 | TS core | tsconfig, typed models | Type check passes, no perf regression |
| 3 | Adapter abstraction | Interface + tests | 90% adapter coverage, merge unaffected |
| 4 | Electron hardening | Preload, contextIsolation | All automated tests pass with hardened settings |
| 5 | UI pilot | Framework POC behind flag | Pilot toggled on shows parity for read-only list |
| 6 | Full UI migration | Component porting | Legacy views removed, parity test suite green |
| 7 | Performance | Worker crypto, virtualization | KDF off main thread, search latency reduced 20% |
| 8 | Plugin sandbox | Manifest v2, capability model | Legacy plugin support warns; new sandbox works |
| 9 | Security refinement | CSP strict, SRI, audits | 0 high vulns, CSP passes test |
| 10 | Accessibility | WCAG audit fixes | Automated a11y score ≥ 90 |
| 11 | Cleanup | Remove deprecated paths | Debt register updated, docs current |

## Phase Details (Additions)

### Phase 1 Rollback
Keep dual script path (`build:legacy`) for one release; abort if parity tests detect diff.

### Phase 4 Risk
IPC exposure. Mitigation: automated test enumerating allowed channels; deny extraneous.

### Phase 5 Metrics
Compare DOM node count and render duration vs legacy list.

### Phase 7 KPIs
| KPI | Baseline | Target |
|-----|----------|--------|
| Unlock freeze time | 1200 ms | 600 ms |
| Search (10k) | 50 ms | 35 ms |
| Initial bundle | 1.2 MiB | 900 KiB |

### Phase 8 Capability Model
Capabilities: `ui.theme`, `ui.panel`, `storage.read-meta` (no storage raw bytes), `clipboard.copy`. Deny by default.

## Risks (Aggregated)

| Risk | Phase | Severity | Mitigation |
|------|-------|----------|------------|
| Parity drift | 5–6 | High | Snapshot diff tests |
| Plugin breakage | 8 | High | Dual loader |
| Performance regression | 2,5,6 | Medium | Budget gates |
| Security misconfig | 4,9 | Medium | Automated security checklist |

## Acceptance Criteria (Global)

- Each phase merges only after exit criteria & rollback plan documented.
- Metrics dashboard shows delta per phase.
- No P1 security regression introduced (verified by automated tests).

## Non-Goals

Skipping intermediate phases; large rewrite big-bang avoided.

## Cross References

- Options rationale: [stack options](../95_stack/options.md)
- Baseline definitions: [current stack](../95_stack/current.md)
- Event system context: [system architecture](../20_architecture/system.md)

## Immediate Next Actions

1. Implement metric script (Phase 0).
2. Draft webpack-only scripts (Phase 1).
3. Select UI framework evaluation criteria (link to options matrix).

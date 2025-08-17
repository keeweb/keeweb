# Current stack (legacy baseline)

## Audit (gaps → resolved)

- Lacked clear legacy constraints → added.
- No mapping to modernization triggers → added.

## Legacy Components

| Area | Current | Constraint Impact |
|------|---------|-------------------|
| Task Runner | Grunt + Webpack | Extra indirection |
| UI Framework | Backbone-style + jQuery | Difficult state predictability |
| Language | ES5/ES2015 mix | Lack of static typing |
| Crypto | kdbxweb | Sufficient (keep) |
| Packaging | Electron custom scripts | Harder upgrade |
| Security | NodeIntegration enabled | Increased attack surface |
| Indexing | In-memory custom | OK; can optimize |
| Merge | Custom procedural | OK; formal spec needed |

## Technical Debt Categories

| Debt | Risk | Mitigation (Roadmap Phase) |
|------|------|---------------------------|
| Global event bus | Hidden dependencies | Introduce typed store (Phase 5/6) |
| NodeIntegration | XSS → RCE | Harden (Phase 4) |
| Lack of workers | UI stalls on KDF | Worker offload (Phase 7) |
| Grunt reliance | Maintenance overhead | Remove (Phase 1) |

## Acceptance (Baseline)

- Provides functional reference for behavior and regression tests.
- Identifies constraints used to prioritize modernization tasks.

## Non-Goals & Risks

Not rewriting functional parts (crypto) without compelling reason.  
Risk: Over-refactor causing divergence in behavior; maintain parity tests.

## Cross References

- Options: [stack options](../95_stack/options.md)
- Roadmap mapping: [modernization](../99_modernization/roadmap.md)

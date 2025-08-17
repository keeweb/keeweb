# Stack options and comparison

## Audit (gaps → resolved)

- Previous lacked decision matrix; added.
- No risk score per option; added.

## Decision Matrix (Excerpt)

| Dimension | React | Vue 3 | Svelte | Keep (Minimal) |
|-----------|-------|-------|--------|----------------|
| Bundle Size (core) | Med | Med | Small | Small |
| Ecosystem | Large | Large | Growing | Minimal |
| Learning Curve | Moderate | Low-Mod | Low | Legacy |
| TypeScript Support | Mature | Mature | Improving | Manual |
| Migration Path | Component-wise | Component-wise | Component-wise | N/A |

Weights (illustrative): Ecosystem 30%, Maintainability 25%, Performance 20%, Migration Effort 15%, Community 10.

## Storage Adapter Abstraction Options

| Option | Pros | Cons |
|--------|------|------|
| Interface + Classes | Familiar | Boilerplate |
| Functional Adapters | Light | Less explicit typing |
| DI Container | Testable | Complexity |

Recommendation: Start with simple interface + factory.

## State Management Options

| Option | Pros | Cons |
|--------|------|------|
| Redux Toolkit | Predictable, tooling | Boilerplate |
| Zustand | Minimal, fast | Less devtools |
| Pinia (Vue) | Intuitive | Framework lock |
| Custom Signals | Tiny | Reinvent wheel |

## Risk Scores (1 low – 5 high)

| Change | Risk | Mitigation |
|--------|------|------------|
| Electron hardening | 3 | Preload bridge, audit dependencies |
| UI framework migration | 4 | Feature flags, parity tests |
| TS introduction | 2 | Incremental, strict mode later |
| Plugin sandbox | 4 | Dual loader grace period |
| Worker crypto | 3 | Golden KDF tests |

## Acceptance Criteria (Options Phase)

- Selected UI framework documented with rationale referencing matrix.
- Chosen state management includes POC proving search & edit flows.
- Adapter abstraction benchmarks show ≤5% overhead vs direct calls.

## Non-Goals & Risks

Non-Goal: Simultaneous adoption of multiple experimental frameworks.  
Risk: Over-optimizing early; enforce metric-driven decisions.

## Cross References

- Baseline: [current stack](../95_stack/current.md)
- Implementation plan: [roadmap](../99_modernization/roadmap.md)

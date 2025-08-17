# Modernization roadmap

Phased plan referencing stack options; aims for incremental, measurable improvements.

## Phase 0 baseline

Capture metrics: bundle size, cold start, memory (1 / 3 vaults), build time (clean + incremental), test coverage, dependency vulnerability count. Tag baseline.

## Phase 1 build simplification

Drop Grunt; replicate tasks via npm scripts + webpack plugins. Success: ≥10% build time reduction, identical dist contract.

## Phase 2 TypeScript core

Add tsconfig; convert core models (vault, entry, group), storage adapter interface, minimal ambient types for kdbxweb. Enable incremental strictness later.

## Phase 3 adapter abstraction

Formal StorageAdapter interface with unit tests and mocks. Outcome: >90% adapter code covered, easier injection and worker offload preparation.

## Phase 4 electron hardening

Introduce preload bridge; disable nodeIntegration; enable contextIsolation; audit IPC surface; adjust CSP. Success: feature parity under hardened settings.

## Phase 5 UI pilot

Implement read‑only entry list + details in chosen framework behind feature flag. Measure render latency and bundle delta.

## Phase 6 full UI migration

Incrementally port remaining views; replace event bus with store; remove legacy view layer after parity. Flag default on.

## Phase 7 performance

Move Argon2 / encryption to worker, virtualize lists, code split optional panels, tune search indexing. Target ≥20% cold start improvement.

## Phase 8 plugin sandbox

Versioned manifests, capability declaration, optional isolated execution, legacy compatibility shim with deprecation notice.

## Phase 9 security refinement

Stricter CSP (nonce), SRI for remote metadata, dependency audit gate, optional WASM Argon2 fallback.

## Phase 10 accessibility polish

Keyboard navigation audit, ARIA labeling, focus management, reduced motion, high contrast validation.

## Phase 11 cleanup

Remove deprecated flags and legacy code paths, update documentation, finalize migration notes.

## Metrics tracked per phase

Bundle size, startup time, memory, build time, test coverage, vuln count, search latency, list render time.

## Risk mitigation

- Feature flags for UI/plugin changes
- Golden encryption round‑trip tests before crypto moves
- IPC allowlist tests for hardening
- Performance budget enforced in CI

## Rollback strategy

Retain previous bundle path and flag gates for one release after major shifts (build removal, UI migration, plugin sandbox). Canary/beta channel for early validation.

## Immediate next actions

1. Implement baseline metrics script
1. Prepare webpack-only build scripts (parallel to existing)
1. Draft TypeScript typings for core models

Progress notes appended here as phases

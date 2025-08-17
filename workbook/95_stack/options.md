# Stack options and comparison

Modernization avenues relative to current stack (see current stack file for baseline).

## Build tooling

- Remove Grunt → direct npm scripts + webpack (lowest risk)
- Later migrate to Vite for faster dev reload (after legacy globals reduced)
- esbuild/rspack considered only if webpack maintenance becomes costlier

## Language

Incremental TypeScript: start with domain models and storage adapters; enable stricter compiler options in phases.

## UI framework

Evaluate small pilot in:

- React + lightweight state (Zustand or Redux Toolkit)
- Vue 3 + Pinia
- Svelte (size advantage, smaller ecosystem)

Prototype entry list + details to judge complexity; decide before large migration.

## State management

Central store replacing ad‑hoc event bus; predictable updates and easier testing. Keep pluggable for framework choice.

## Plugin isolation

Introduce versioned manifest schema and capability declaration; optional sandbox (iframe or isolated context) with restricted messaging API.

## Electron hardening

Enable contextIsolation, disable nodeIntegration, restrict IPC channels, preload bridge with explicit allowlist.

## Performance improvements

Web workers for Argon2/encryption, virtualized large lists, code splitting for rarely used panels (generator, plugin manager), lazy load storage adapters.

## CSS and theming

Consolidate theme differences with CSS variables; consider utility layer (optional) only after migration to prevent churn.

## Testing expansion

Add unit (Vitest/Jest), component tests (after framework), and end‑to‑end (Playwright) including desktop harness.

## Security upgrades

Stricter CSP (nonce only), SRI for plugin gallery metadata, automated dependency audits gating CI, WASM Argon2 fallback.

## Migration order (summary)

1. Build simplification
1. TypeScript foundations
1. Adapter interface extraction
1. Electron hardening groundwork
1. UI pilot
1. Full UI migration
1. Performance (workers, splitting)
1. Plugin sandbox
1. Security tightening
1. Cleanup

## Deferred

Switching away from Electron (e.g. Tauri) or reimplementing kdbxweb are explicitly out of scope until post‑migration stability.

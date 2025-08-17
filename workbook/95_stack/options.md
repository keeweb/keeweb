# Stack Options & Comparison

Goal: outline realistic modernization paths compared to the current stack (see current snapshot in 95_stack/current.md).

## Current Reference Points

- Build orchestration: Grunt ([Gruntfile.js](../../Gruntfile.js)) calling webpack ([webpack.config.js](../../webpack.config.js))
- Runtime: plain ES modules (mixed styles), legacy Backbone-style patterns, event bus
- Desktop shell: Electron ([desktop/main.js](../../desktop/main.js))
- Entry HTML: [app/index.html](../../app/index.html)
- Config and scripts: [package.json](../../package.json)
- Historical constraints and changes listed in [release-notes.md](../../release-notes.md)

## Modern Build & Tooling Alternatives

1. Pure npm + webpack

   - Remove Grunt layer; invoke webpack directly with mode-aware configs.
   - Pros: smallest conceptual change, minimal risk.
   - Cons: keeps webpack complexity.

1. Vite (esbuild + rollup pipeline)

   - Fast dev server (instant HMR), simpler config.
   - Pros: improved DX, faster cold/hot builds.
   - Cons: migration effort for legacy module resolution, plugin adaptation.

1. esbuild (scripted) or rspack

   - Very fast builds, simple API.
   - Pros: speed.
   - Cons: ecosystem maturity (advanced loaders/plugins may need rewriting).

1. Turborepo / Nx (optional)

   - Only if splitting repo into packages (core lib, desktop shell, web).
   - Pros: caching, parallelization.
   - Cons: added structural complexity if monolith is retained.

Recommendation path: step 1 (drop Grunt), then evaluate Vite once legacy globals refactored.

## Language & Type System

- Introduce TypeScript incrementally (dual .js/.ts allowed).\
  Pros: safer refactors, clearer domain types (entry, file, adapter interfaces).\
  Cons: upfront typing overhead.\
  Migration steps: set up tsconfig extending current jsconfig; type critical model modules first; enable isolatedModules for mixed code.

## UI / Framework Layer

Current: custom views + Backbone-like models.

Options:

1. React + Redux Toolkit (or Zustand)

   - Pros: large ecosystem, predictable state.
   - Cons: bundle size, learning curve if unfamiliar.

1. Vue 3 + Pinia

   - Pros: integrated reactivity, gentle learning curve, smaller boilerplate.
   - Cons: smaller hiring pool vs React (context dependent).

1. Svelte (or SvelteKit for routing wrapper)

   - Pros: very small bundles, simple syntax.
   - Cons: less mature enterprise ecosystem; plugin system rework needed.

1. Keep vanilla + small reactive libs (Preact + signals)

   - Pros: minimal footprint.
   - Cons: more custom wiring; harder long term maintainability.

Recommendation: prototype minimal feature slice (entry list + detail pane) in React and Vue to compare verbosity and migration friction before committing.

## State Management

- Move from ad‑hoc event bus to explicit store.
- Libraries: Redux Toolkit (with RTK Query for storage providers), Pinia (Vue), or Zustand/Jotai (React lightweight).
- Benefits: deterministic updates, easier devtool inspection.

## CSS / Theming

- Adopt PostCSS + CSS variables fully (already partially) and remove theme duplication.
- Option: Tailwind for utility classes (pros: speed; cons: class noise) or CSS Modules for isolation.
- Shadow DOM web components only if plugin theming isolation becomes critical.

## Plugin System Modernization

Current: signature-verified script/style injection.

Enhancements:

- Stable manifest schema versioning.
- Sandboxed execution via iframe or isolated context with postMessage API.
- Capability filtering (declare allowed APIs; enforce at bridge boundary).
- Optional ESM plugin entry (import map or dynamic import).

## Electron Hardening

- Enable contextIsolation, disable nodeIntegration in renderer, use preload script with secure IPC channel.
- Adopt electron-builder or Electron Forge for simpler config (if current custom pipeline burdensome).
- Code splitting (dynamic import) to reduce first paint.

## Testing

Add:

- Unit: Vitest or Jest (Vitest pairs well with Vite if adopted).
- Component: Testing Library (React/Vue) after UI migration.
- E2E: Playwright (covers desktop via electron launch + web).
- Security regression: script to scan CSP, dependency audit (npm audit ci gating).

## Performance Opportunities

- Virtualized list (react-window / Vue Virtual Scroll) for large entry sets.
- Web worker for KDF / encryption (offload Argon2id to keep UI responsive).
- Code splitting: authentication providers, generator panel, plugin manager lazy loaded.

## Storage & Sync Layer Refactor

- Define TypeScript interface: StorageAdapter { id, load(meta), save(meta, data), stat(meta), revoke() }.
- Provide dependency-injected adapters for testability.
- Consider streaming parsing for large files (kdbxweb adaptation) to reduce memory spikes.

## Security Improvements

- Enforced CSP with only hash/nonce-based inline allowances (already tightening per release notes).
- Move to Subresource Integrity (SRI) for plugin gallery manifest if remote.
- Optional WebAssembly Argon2 with runtime fallback.
- Adopt secure Electron defaults (see checklist items already referenced in releases).

## Migration Strategy (Incremental)

1. Remove Grunt → direct webpack scripts.
1. Introduce TypeScript in non-UI core (models, adapters).
1. Abstract storage adapter interface (compat layer).
1. Introduce framework pilot (one screen) behind feature flag.
1. Migrate remaining views incrementally; keep legacy shell until parity.
1. Enable Electron security flags (contextIsolation) after removing implicit globals.
1. Add test layers (unit → component → e2e).
1. Optimize performance (virtualization, workers) after correctness baseline.
1. Modernize plugin API (versioned manifest, sandbox).
1. Remove legacy code paths (event bus, old views).

## Decision Criteria

Evaluate each candidate by:

- Maintenance cost (lines of custom glue removed).
- Build time and dev feedback loop.
- Bundle size impact (measure before/after).
- Security posture (renderer attack surface reduction).
- Ecosystem longevity (library update cadence).
- Migration friction (rewrite vs adapter shims).

## Deferred / Out of Scope Now

- Moving away from Electron (e.g., Tauri) until post-migration stability (different tradeoffs around native APIs and cryptography).
- Replacing kdbxweb (unless audit reveals blocker).
- Multi-user realtime sync (would require server component; not aligned with current product scope).

## Summary

Adopt a low-risk stepping path: prune Grunt, add TypeScript types, formalize adapters, trial a modern reactive UI, then lock in security hardening and plugin sandboxing. Avoid large all-at-once rewrites; keep user-visible changes incremental and reversible. A detailed sequencing with timeline appears in the modernization roadmap file (upcoming).

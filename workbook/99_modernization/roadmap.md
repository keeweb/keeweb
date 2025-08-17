# Modernization Roadmap

High-level phased plan derived from analysis in [95_stack/current.md](../95_stack/current.md) and options in [95_stack/options.md](../95_stack/options.md).

## Principles

- Incremental, user-visible parity preserved each step
- Reversible where practical (feature flags)
- Security and data integrity over cosmetic change
- Measure before / after

## Phase 0: Baseline

Tasks:

- Snapshot metrics (bundle size, cold start, memory after opening 1 / 3 vaults, build time, test coverage, open vulnerabilities)
- Lock dependency versions in [package.json](../../package.json)
- Tag baseline

Exit:

- Metrics documented in this file
- Green CI

## Phase 1: Build Simplification

Tasks:

- Replace Grunt ([Gruntfile.js](../../Gruntfile.js), [grunt.tasks.js](../../grunt.tasks.js), [grunt.entrypoints.js](../../grunt.entrypoints.js)) with direct npm scripts invoking [webpack.config.js](../../webpack.config.js) and PostCSS
- Preserve output contract (dist/ contents unchanged)
- Remove only Grunt-specific dev helpers, keep logic

Risks: accidental change in hashing or service worker scope\
Mitigation: diff dist/ vs baseline (excluding hash values)

Exit:

- Build time improvement target ≥10%
- All features load identically

## Phase 2: TypeScript Foundations

Tasks:

- Add tsconfig; allow js with checkJs false initially
- Convert domain models (file, entry, group, storage adapter interfaces) first
- Add minimal type definitions for kdbxweb usage
- Enforce noImplicitAny later (two-step)

Risks: type drift vs runtime\
Exit: core domain modules typed; build passes; no runtime errors increase

## Phase 3: Storage Adapter Abstraction

Tasks:

- Formal interface (StorageAdapter) implemented by existing backends
- Isolated tests (mock network, local fs) in [test/](../../test)
- Central registry injection

Benefits: easier future providers, worker offloading later\
Exit: 90% adapter logic covered by tests

## Phase 4: Electron Security Hardening

Prereq: types for bridges and adapter isolation

Tasks:

- Introduce preload script; disable nodeIntegration; enable contextIsolation in [desktop/main.js](../../desktop/main.js)
- Whitelist IPC channels; remove global window leaks
- Audit CSP in index ( [app/index.html](../../app/index.html) )

Exit: App functional under hardened settings; security checklist items applied

## Phase 5: UI Pilot Migration

Tasks:

- Choose framework (React or Vue) after spike
- Implement read-only entry list + details bound to existing models via adapter layer
- Feature flag toggle (settings)

Metrics: pilot bundle delta, render latency vs legacy\
Exit: Pilot merged, flag off by default

## Phase 6: Full UI Migration

Tasks:

- Incrementally port views (search bar, sidebar, modals, generator, settings)
- Replace event bus with state store (see options doc)
- Remove legacy view code once parity reached

Exit: Flag on by default; legacy code deleted

## Phase 7: Performance Improvements

Tasks:

- Web worker for Argon2 / encryption path (kdbxweb off main thread)
- Virtualized lists for large vaults
- Code splitting (auth providers, generator, plugin manager)
- Measure cold start improvement target ≥20%

Exit: Metrics improved; no functional regressions

## Phase 8: Plugin System Modernization

Tasks:

- Versioned manifest schema
- Capability declaration and enforcement
- Optional iframe / isolated context execution
- Backward compatibility shim for legacy plugins

Risks: community plugin breakage\
Mitigation: dual loader window during transition

Exit: New API documented; legacy path deprecated with warning

## Phase 9: Security Enhancements

Tasks:

- Strict CSP (hash/nonce only)
- Optional Subresource Integrity for gallery manifest
- Dependency audit gate in CI (npm audit, osv scanner)
- Optional WASM Argon2 fallback

Exit: Reduced high severity advisories (target zero)

## Phase 10: Accessibility & UX Polish

Tasks:

- WCAG pass: keyboard traps, aria labels, focus outlines
- High contrast validation
- Reduced motion preference support

Exit: Accessibility checklist complete

## Phase 11: Cleanup & Debt Removal

Tasks:

- Remove unused config flags
- Purge deprecated APIs
- Update documentation (README, self-hosting, developer guide)

Exit: Changelog entry summarizing deprecations

## Metrics To Track (Per Phase)

- Bundle size (main + total)
- Cold start (DOMContentLoaded to interactive)
- Memory (after opening 3 large vaults)
- Build time (clean + incremental)
- Test coverage %
- Vulnerability count (prod dependencies)
- UI interaction latency (search keystroke to paint)

## Risk Summary

- Data loss (storage merge, encryption refactor)
- Plugin breakage (API changes)
- Security regression (IPC exposure)
- Performance regressions (framework overhead)

Mitigations:

- Golden file encryption tests (round-trip)
- Plugin compatibility test harness
- IPC allowlist tests
- Performance budget thresholds in CI

## Sequencing Dependencies

- TypeScript before deep refactors (gives safety)
- Adapter abstraction before worker offload
- Security hardening after removal of implicit globals
- Plugin sandbox after framework migration (avoid double-work)

## Rollback Strategy

- Feature flags for phases 5–8
- Keep legacy build script for one release after Phase 1
- Dual plugin loader while deprecating old manifests
- Canary releases (beta channel) for end-user validation

## Done Definition Per Phase

- All tasks implemented
- Tests updated
- Documentation touched (this file + change log in [release-notes.md](../../release-notes.md))
- Metrics recorded with delta vs baseline

## Next Immediate Actions

1. Implement Phase 0 metric script (node script reading dist stats + simple puppeteer run)
1. Draft Phase 1 npm scripts mirroring Grunt flows
1. Prepare tsconfig and convert first model file

(Record progress inline below as phases complete.)

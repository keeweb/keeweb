# Repository map (abstracted)

## Audit (gaps → resolved)

- Previously concrete repo paths (now abstracted for rebuild guidance).
- Missing module responsibility table → added.
- No dependency directions → added.

## Module Responsibility Table

| Module | Responsibility | Depends On |
|--------|----------------|-----------|
| `crypto/` | KDF, cipher, protected values | util |
| `model/` | Vault, Group, Entry data structures | crypto |
| `storage/` | Adapters (webdav, cloud, local) | util, model |
| `sync/` | Merge, conflict detection, scheduling | model, storage |
| `search/` | Index build/query, fuzzy | model |
| `history/` | Entry revision mgmt | model |
| `ui/` | Components, rendering, theming | model, search, sync |
| `security/` | Clipboard clearing, auto-lock | model, crypto |
| `plugin/` | Manifest load, signature verify | security |
| `platform/` | Electron bridges / browser wrappers | util |
| `config/` | Load & validate user/environment settings | util |
| `util/` | Helpers (logging, hashing, random) | (none) |

Dependency direction: strictly downwards (no cycles); UI never calls storage directly (uses sync layer).

## Entry Points (Abstract)

| Entrypoint | Purpose |
|------------|---------|
| `main-desktop` | Electron main: window, update, IPC |
| `renderer` | Bootstraps app shell after DOM ready |
| `service-worker` | Caching logic |
| `plugin-loader` | Verifies & registers plugins |

## Boot Sequence (Renderer)

1. Load user config.
2. Initialize crypto engine.
3. Restore recent vault metadata list.
4. Register event listeners (lock, visibility change).
5. Render open screen.
6. On vault open: perform crypto unlock pipeline → mount main workspace.

## Testing Targets

| Layer | Primary Tests |
|-------|---------------|
| crypto | Known answer tests (Argon2), encrypt/decrypt round-trip |
| merge | Conflict scenarios (modify/modify, delete/modify) |
| search | Tokenization, fuzzy fallback |
| adapters | Mock network, revision mismatch |
| ui | Accessibility roles, shortcut triggers |

## Acceptance Criteria

- Dependency graph static analysis finds no cycles.
- Boot completes to open screen with zero unhandled promise rejections.
- Service worker install completes without requesting secrets.

## Non-Goals & Risks

Non-Goals: Monorepo multi-package complexity (single package adequate).  
Risks: Tight coupling if UI bypasses sync (guard with interface boundaries).

## Cross References

- Architectural event catalog: [system architecture](../20_architecture/system.md#event-catalog)
- Build process for entrypoints: [build pipeline](../40_build/pipeline.md)

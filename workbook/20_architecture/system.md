# System architecture

Structural overview of components and data flow.

## Runtime shape

Single-page application (shared by web and desktop). Desktop wraps the same build in Electron main process. Service worker adds offline asset and vault caching for web.

## Layered breakdown

1. Models and collections\
   Vault (file) model, group and entry models, collections for groups, entries, file infos. Event-driven updates.
1. Domain operations\
   Open/create, merge, history, search indexing, tag aggregation, entry templates, auto‑type (desktop only).
1. Crypto layer\
   kdbxweb handles parsing, encryption/decryption, KDF, protected values. Composite key assembly before decryption.
1. Storage adapters\
   Uniform interface (load, save, stat, revoke) for each backend. Injected into sync logic.
1. Sync/merge coordinator\
   Orchestrates stat, conditional load, merge, save, conflict resolution, cache updates, backups.
1. UI layer\
   Legacy view system (Backbone-like) binding models to DOM; renders panels, lists, dialogs, settings.
1. Plugin subsystem\
   Manifest + signature validation; dynamic script/style loading; extension hooks (themes, features).
1. Persistence and cache\
   Local settings store, file info collection, encrypted remote vault cache, optional backups.
1. Event bus\
   Global pub/sub for lock, sync triggers, theme change, shortcut routing.

## Key flows

Open vault:

- Load source (local dialog, remote adapter, cache)
- Decrypt via kdbxweb
- Build object maps (entries/groups), resolve references
- Index for search, expose to UI

Save / sync:

- Serialize current db
- Encrypt
- Save to cache (if enabled) and optionally remote
- Update revision / metadata; clear dirty state on success

Merge (remote change):

- Load remote
- Parse remote db
- kdbx merge
- Mark dirty if local modifications remain unsaved
- Refresh object maps and UI

Lock:

- Clear decrypted sensitive values
- Replace active views with unlock prompt (vault instances remain listed)
- On unlock, rederive key and reopen db in memory

## Separation web vs desktop

Desktop adds:

- File system watch
- Auto‑type engine
- Hardware integration (YubiKey)
- Tray/menu integration and updater
  Web relies solely on browser APIs and service worker.

## Security considerations (summary)

Renderer isolation not fully modern (see modernization roadmap). Plugin signatures validated. CSP hardened. Sensitive data kept only in process memory of active session; local caches are encrypted KDBX files.

## Out of scope here

Detailed build pipeline, technology choices, and modernization steps live in dedicated files (build, stack, options, roadmap) to avoid duplication.

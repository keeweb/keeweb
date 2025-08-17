# System Architecture (High Level)

Plain-language map of the app structure; no deep implementation yet.

## Overview

Single-page application (SPA) shared by web and desktop:

- Core UI and logic bundled (webpack + grunt) into assets served as static files
- Desktop wraps the same build in Electron ([desktop/main.js](../../desktop/main.js))
- Web served as static HTML ([app/index.html](../../app/index.html)) with a service worker for offline use

## Major Layers

1. UI layer

   - Views/layouts composed with legacy MVC patterns (Backbone-style collections/models: entries, groups, files)
   - Reactive updates: model change events trigger view re-render or partial DOM updates
   - Theming done via compiled CSS (postcss) plus optional plugin-provided CSS

1. Domain models

   - File model: wraps an opened `.kdbx` vault, tracks dirty state, path/backend, sync revision, lock state
   - Entry and group models: hierarchical tree; support tags, history, attachments
   - Collections: in-memory indexes for fast search and filtered views

1. Crypto / KDBX layer

   - kdbxweb library handles parsing, encrypt/decrypt, KDF (Argon2id or AES-KDF), ciphers (AES/ChaCha20)
   - ProtectedValue objects defer decrypting sensitive fields until needed; wiped on lock
   - Key assembly: password + optional keyfile + optional hardware challenge (YubiKey on desktop) → KDF → master key

1. Storage adapters

   - Local (desktop fs) via Node APIs (Electron)
   - Local (web) via user file open/save dialogs (no background write)
   - WebDAV via HTTP (PROPFIND, GET, PUT)
   - Dropbox, Google Drive, OneDrive via OAuth 2 (short‑lived tokens where supported)
   - URL (read-only fetch)
   - Each adapter implements: load, save (if writable), stat/modified check, revoke/logout

1. Sync & merge

   - Load: fetch remote (or local) bytes, decrypt into models
   - Save: serialize models → encrypt → push adapter save method
   - Merge flow on remote change: load remote, diff entries/groups, auto-merge non-conflicting, flag conflicts for user choice, preserve entry history

1. State & events

   - Central app state holds list of opened File models and the active file
   - Global event bus for cross-cutting actions (lock, theme change, shortcut dispatch, sync trigger)
   - Dirty flag per file; timers for auto-save or periodic remote change polling (configurable)

1. Search & indexing

   - On file load builds in-memory indexes (titles, usernames, urls, tags)
   - Advanced search can traverse additional fields / history when requested
   - Filtering pipeline: base collection → group/tag scope → text filter → sort (user setting)

1. Plugin system

   - Loads signed plugin manifest (remote or local) listing scripts/styles
   - Signature verification before executing (public keys embedded)
   - Plugin assets extend UI (themes, features) via defined extension points

1. Offline support

   - Service worker caches core assets and previously opened vault responses (if remote)
   - Cached encrypted file allows reopen and modification offline; queued save until manual sync
   - Desktop inherently offline capable (local filesystem copy)

1. Configuration & persistence

   - Settings stored locally (desktop: config with optional encryption key stored in OS keychain; web: local storage / IndexedDB)
   - References to recent files, storage tokens, UI preferences (theme, layout, columns, shortcuts)
   - Optional restrictions (disable save/export) respected in UI conditionals

## Desktop vs Web

| Concern | Desktop (Electron) | Web |
|--------|---------------------|-----|
| File I/O | Direct fs read/write dialogs, watchers for external changes | User-initiated open/save (File API); no background write |
| Auto-type | Global shortcuts + window title/process matching | Not available (browser security) |
| Hardware | YubiKey (USB) | None |
| Keychain | OS keychain for config encryption | N/A |
| Updates | In-app updater with signature verification | Browser handles asset refresh |
| Tray / dock | Tray or menu bar integration, global focus control | Standard browser tab / PWA |

## Locking Flow

1. Trigger (timeout, manual, system event)
1. In-memory decrypted values cleared (ProtectedValue only re-derivable from file)
1. UI switches to unlock screen for each locked file (can unlock individually)
1. On unlock: derive composite key → decrypt header → restore model graph

## Error & Conflict Handling

- Network/auth errors surface non-blocking notifications with retry action
- Merge conflicts captured as structured differences (per entry field); user picks local or remote
- External modification (desktop) prompts before overwriting unsaved local changes

## Build & Packaging (Pointer)

- Webpack bundle orchestrated by grunt tasks ([Gruntfile.js](../../Gruntfile.js), [webpack.config.js](../../webpack.config.js))
- Desktop packaging produces platform installers and portable builds (configured in packaging scripts)
- Output artifacts: single-page app assets + Electron bundles

## Security Surface (Pointers)

- CSP applied (tightened over releases)
- Plugin signatures validated prior to execution
- Short-lived OAuth tokens for storages (Dropbox etc.)
- Service worker scope limited to app assets

## Data Flow (Typical Save)

User edit → model mutation → dirty flag → (auto-save or manual save) → serialize via kdbxweb → encrypt → adapter.save() → update revision metadata → clear dirty

## What Comes Later

Subsequent documents:

- repo-map: concrete directories and entry points
- build/pipeline: detailed build chain, packaging, update
- stack/current: libraries and runtime environment specifics
- modernization: proposed refactors (isolation, framework update, security hardening)

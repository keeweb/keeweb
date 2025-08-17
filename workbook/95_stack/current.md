# Current stack

Technologies presently used.

## Runtime

- SPA with legacy Backbone-style models/collections and custom views
- Electron for desktop; same renderer bundle as web
- Service worker for offline asset and vault caching

## Core libraries

- kdbxweb (KDBX parsing, crypto, Argon2id, protected values)
- Backbone/underscore/jquery style patterns (evented models)
- dompurify + marked (markdown notes)
- Handlebars templates (precompiled)

## Build chain

- Grunt orchestrates tasks (webpack, postcss, hashing, HTML minify, service worker version injection)
- webpack for bundling; Babel transpilation
- PostCSS for CSS processing; ESLint for linting

## Storage adapters

Local filesystem (desktop), browser local open/save, WebDAV, Dropbox, Google Drive, OneDrive, read‑only URL. Unified interface consumed by sync logic.

## Desktop specifics

Auto‑type engine, global shortcuts, updater, YubiKey integration, tray/menu handling, file watchers.

## Security mechanisms

kdbxweb crypto, plugin signature verification, CSP hashing, clipboard clearing, auto‑lock triggers, external modification detection, optional disabling of caching/export per settings.

## UI layer

Theme system (CSS variables), list and table views, responsive layout, attachment and markdown rendering, entry templates, tag aggregation.

## Known limitations

- No TypeScript
- Legacy event bus and manual DOM view updates
- Renderer not fully hardened (nodeIntegration still present)
- Grunt adds build indirection
- No web worker offload for heavy crypto

## Extensibility

Plugin manifests (scripts + styles), themes, localization packs. Signature verification before execution.

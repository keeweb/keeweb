# Current Stack (Frameworks & Tools)

Snapshot of libraries, runtime environment, and build tooling in this repo.

## Runtime Overview

- Single-page application loaded from [app/index.html](../../app/index.html)
- Desktop wrapper via Electron main process ([desktop/main.js](../../desktop/main.js)) loading the same SPA
- Service worker (offline cache of core assets and previously opened vaults)
- Plain ES (no TypeScript); legacy MV\* patterns (Backbone-style models/collections, event-driven views)

## Core Libraries / Modules

- kdbxweb: KDBX parsing, encryption (AES-256, ChaCha20), KDF (Argon2id, AES-KDF), ProtectedValue handling
- Backbone-style stack (Backbone + underscore/lodash + jQuery pattern) for models, collections, event bus
- Plugin system: loads signed plugin manifests (themes, features)
- Localization: string resource bundles (loaded at runtime, language auto-detected or user-selected)

## Build & Tooling

- Node / npm project ([package.json](../../package.json))
- Grunt as orchestrator ([Gruntfile.js](../../Gruntfile.js), [grunt.tasks.js](../../grunt.tasks.js), [grunt.entrypoints.js](../../grunt.entrypoints.js))
- Webpack bundling ([webpack.config.js](../../webpack.config.js)) fed with multiple entrypoints
- Babel transpilation ([.babelrc](../../.babelrc))
- PostCSS for CSS transforms ([postcss.config.js](../../postcss.config.js))
- ESLint for linting ([.eslintrc](../../.eslintrc))
- jsconfig for editor intellisense ([jsconfig.json](../../jsconfig.json))

## Desktop Integration

- Electron APIs for:
  - File system access (open/save dialogs, watching external modifications)
  - Global shortcuts (auto-type, show window)
  - Tray / menu bar, custom title bars
  - Auto-update (delta packages, signature verification)
  - Hardware integration (YubiKey via USB modules)
- Platform-specific packaging scripts (driven by Grunt tasks, resources in [package/](../../package))

## Storage & Sync Adapters

- Local filesystem (desktop direct read/write)
- Local (browser) via user file picker (manual save)
- WebDAV (HTTPS, PROPFIND/GET/PUT)
- Dropbox, Google Drive, OneDrive (OAuth 2; short-lived tokens supported)
- URL (read-only fetch)
- Unified adapter interface: load, save (if writable), stat/change check, revoke/logout

## Security / Crypto Components

- kdbxweb for all cryptography (encryption, KDF, ProtectedValue)
- Composite key assembly (password + optional keyfile + optional YubiKey challenge)
- Plugin signature verification (public keys embedded, rotation noted in [release-notes.md](../../release-notes.md))
- Content Security Policy tightened over releases
- Config encryption key stored in OS keychain (desktop)
- Auto-lock, clipboard clearing, file external modification protection

## UI / Theming / UX

- CSS themes (dark, light, high contrast, macOS variants)
- Dynamic system dark/light switching
- Table and list views, responsive/mobile layout, PWA manifests
- Favicon fetch service integration
- Markdown notes (toggleable), attachment/image preview

## Plugins & Extensibility

- Signed plugin manifests (remote or local)
- Extensions: themes (CSS), feature scripts, localization packs
- Public key list compiled into app for signature validation

## Testing & Quality

- Tests under [test/](../../test) (unit/integration; executed via CI workflows)
- GitHub Actions workflows (.github/workflows) for build, tests, release, Docker, PyPI, npm
- Linting via ESLint in CI

## Containers / Distribution

- Docker images (GitHub Container Registry + Docker Hub) serving dist/ static site
- gh-pages branch archive for static hosting
- Platform installers: macOS dmg/zip, Windows installer/portable, Linux AppImage/deb/rpm/snap

## Known Legacy / Debt

- Grunt-based pipeline (could be replaced by native npm+webpack scripts)
- Electron contextIsolation disabled (modern hardening pending)
- nodeIntegration still enabled in renderer
- Plain JavaScript (no static typing)
- Backbone-era patterns instead of modern reactive framework (React/Vue/Svelte)

## Not Used

- No proprietary server backend (pure static + optional cloud APIs)
- No real-time multi-user collaboration (file-based merge only)
- No TypeScript (yet)

## Reference Files

- Build config: [Gruntfile.js](../../Gruntfile.js), [webpack.config.js](../../webpack.config.js)
- Entry HTML: [app/index.html](../../app/index.html)
- Desktop main: [desktop/main.js](../../desktop/main.js)
- Release history / security changes: [release-notes.md](../../release-notes.md)

Further comparison with alternative stacks will appear in `95_stack/options.md`.

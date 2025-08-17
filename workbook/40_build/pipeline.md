# Build & Packaging Pipeline

High-level view of how the web app and desktop binaries are built, packaged, signed, and updated.

## Tooling

- Task runner: Grunt ([Gruntfile.js](../../Gruntfile.js), [grunt.tasks.js](../../grunt.tasks.js), [grunt.entrypoints.js](../../grunt.entrypoints.js))
- Bundler: webpack ([webpack.config.js](../../webpack.config.js))
- Transpile / lint: Babel ([.babelrc](../../.babelrc)), ESLint ([.eslintrc](../../.eslintrc))
- Styles: PostCSS ([postcss.config.js](../../postcss.config.js))
- Desktop shell: Electron (entrypoint [desktop/main.js](../../desktop/main.js))
- Metadata / scripts: [package.json](../../package.json)
- Release notes: [release-notes.md](../../release-notes.md)

## Build Flow (Web + Shared SPA)

1. Source js/less/css/images/templates under app/ and related folders.
1. Grunt aggregates entry definitions from [grunt.entrypoints.js](../../grunt.entrypoints.js).
1. webpack compiles modules, applies Babel, emits hashed bundles into dist/.
1. PostCSS processes CSS (autoprefixing, minification).
1. index.html (in [app/index.html](../../app/index.html)) references built bundles (injected or templated).
1. Service worker included for offline caching (sw script bundled alongside assets).

Output: dist/ (static site: index.html + js/css/media). This folder is what gets published for web (gh-pages, self-hosted, docker image).

## Desktop Packaging

1. Reuse dist/ assets.
1. Electron main process code (desktop/ directory) packaged together with dist/.
1. Platform-specific packagers create:
   - macOS: dmg / zip (supports notarization & code signing; dev builds can skip with --skip-sign)
   - Windows: installer exe / portable exe (supports delta auto-update)
   - Linux: AppImage, deb, rpm, snap (as per release notes additions)
1. Optional portable mode artifacts (Windows portable, portable directory env support).
1. Code signing:
   - Windows: Authenticode certificate (paid) signs executables.
   - macOS: Developer ID signing + (modern) notarization; dmg signature disabled in some CI fallback cases (see release history).
   - Integrity/signature files used by the updater for validation (desktop apps integrity protection introduced earlier).

## Commands (Examples)

Development (web dev server + live rebuild):

- grunt dev
- npm run dev

Desktop dev (per platform, without signing):

- grunt dev-desktop-win32 --skip-sign
- grunt dev-desktop-linux --skip-sign
- grunt dev-desktop-darwin --skip-sign
  Or equivalent npm run dev-desktop-<platform> scripts (see [README.md](../../README.md) build section).

Running Electron after building:

- npm run electron

## Continuous Integration / Distribution

- GitHub Actions workflows (in .github/workflows/) build and publish:
  - Tagged releases: upload platform binaries + checksums + update metadata.
  - Docker images (ghcr.io and docker hub) embedding the static dist/ site.
  - PyPI / npm packages (where applicable) for distribution (metadata badges in README).
- gh-pages branch archive contains latest static web distribution for simple hosting.
- Docker images expose the static site behind a lightweight web server; version tags (e.g. 1.19.0, latest, architecture-specific) align with release tags.

## Auto-Update (Desktop)

- The app checks for updates on startup or manual request (configurable).
- Update descriptor fetched from release channel (GitHub releases).
- Package integrity verified (desktop apps integrity protection: release notes v1.6.0).
- New updater (release notes v1.17.0) supports major version upgrades.
- After download and verification, applies update and restarts (Windows had historical fixes for restart edge cases).

## Security & Hardening Points in Build

- Signature verification for plugins (public keys embedded; rotation events listed in release notes).
- CSP hashes generated during build (release notes mention CSP tightening).
- Short-lived OAuth storage tokens (option enabled via app settings; see release notes v1.18.0, v1.16.0, token scope changes in 1.15.x series).

## Versioning & Notes

- Semantic-ish incremental versions recorded in [release-notes.md](../../release-notes.md); features like KDBX4 / KDBX4.1 support, updater changes, token model changes referenced there.
- Release notes bundled with releases for users (about dialog, website reference).

## Artifacts Summary

- Web: dist/ static site (index.html + bundles + service worker)
- Desktop: platform installers / portable binaries wrapping dist/
- Container: image serving dist/ (configurable via env/volumes)
- Ancillary: signature/update metadata, release notes, checksum files, plugin gallery json

## Future Modernization Targets (Pointer Only)

Detailed proposals will go into modernization roadmap:

- Replace Grunt with pure webpack or modern task runner
- Enable Electron contextIsolation / stricter sandbox
- Split renderer bundles for faster cold start (code splitting)
- Move to TypeScript for stricter build-time guarantees

(Those items are not expanded here; this file stays high-level.)

# Repository map

Physical layout and primary entrypoints.

## Top level

- package.json project config and scripts
- Gruntfile.js / grunt.\* legacy task orchestration feeding webpack
- webpack.config.js bundling
- postcss.config.js style processing
- release-notes.md version history
- util/ helper scripts (e.g. version bump)

## Source roots

- app/ static and compiled assets (index.html, scripts/, styles, templates, locales)
- desktop/ Electron main process code (main.js, packaging helpers)
- plugins/ built‑in or sample plugins
- test/ test runner HTML + bundled tests
- build/, package/, graphics/, img/ packaging and asset resources
- workbook/ this documentation set

## Core entrypoints

Web:

- app/index.html loads bundled scripts (in dist/ after build)

Desktop:

- desktop/main.js creates BrowserWindow → loads packaged index.html (same SPA)

## Collections of note

- app/scripts/models/ vault, group, entry, app settings
- app/scripts/collections/ file infos, groups
- app/scripts/views/ UI components (open screen, details, settings, auto‑type popup)
- app/scripts/storage/ (adapters; not expanded here for brevity)

## Generated output

- dist/ built SPA and update manifest
- tmp/ intermediate build artifacts (transient)

## Adding code

Place new domain logic under app/scripts/, reuse existing module pattern, register new entrypoint only if truly separate bundle is required (rare).

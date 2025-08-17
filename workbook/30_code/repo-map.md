# Repo Map & Entry Points

Concise layout of main directories and how the app boots (web + desktop).

## Top-Level Files

- [package.json](../../package.json) project metadata, scripts, dependency list
- [Gruntfile.js](../../Gruntfile.js) orchestrates build tasks
- [grunt.tasks.js](../../grunt.tasks.js) task definitions referenced by Gruntfile
- [grunt.entrypoints.js](../../grunt.entrypoints.js) webpack entrypoint list (used by webpack.config.js)
- [webpack.config.js](../../webpack.config.js) bundling config (inputs from grunt.entrypoints.js → outputs in dist)
- [postcss.config.js](../../postcss.config.js) css processing (autoprefixing, etc.)
- [.babelrc](../../.babelrc) JS transpilation settings
- [.eslintrc](../../.eslintrc) lint rules

## Application Source

- [app/](../../app) static web assets (index.html, css, images, localization, templates, bundled output target folder)
  - [app/index.html](../../app/index.html) web entry HTML loaded by browser and Electron renderer
- [desktop/](../../desktop) Electron main-process code (app bootstrap, windows, auto-update, menus, tray)
  - [desktop/main.js](../../desktop/main.js) desktop entrypoint (creates BrowserWindow, loads packaged index.html)
- [util/](../../util) helper scripts, build utilities, shared small modules
- [plugins/](../../plugins) bundled or sample plugins (themes, feature extensions); plugin signatures validated at runtime
- [test/](../../test) automated tests (unit/integration) executed by CI
- [build/](../../build) build-time artifacts or helper scripts (icons, updater, packaging helpers)
- [package/](../../package) packaging resources (icons, installers, metadata consumed during desktop build)
- [docs/](../../docs) documentation assets (images referenced in README, guides)
- [img/](../../img) project images (screenshots, badges)
- [graphics/](../../graphics) vector or design source assets

## Generated / Output (during build)

- dist/ (created) final web distributable: minified js bundles, css, index.html
- tmp/ (created) intermediate build output during dev tasks

## Entry Points Summary

Web:

1. Browser requests [app/index.html](../../app/index.html).
1. Script tags (injected/generated via webpack) load bundles defined in [grunt.entrypoints.js](../../grunt.entrypoints.js) and built by [webpack.config.js](../../webpack.config.js).
1. App bootstrap code mounts UI, loads recent file list / config, then waits for user action to open a vault.

Desktop (Electron):

1. OS launches binary; Electron runs [desktop/main.js](../../desktop/main.js).
1. Main process sets app handlers (single instance lock, menus, tray, auto-update).
1. BrowserWindow loads packaged index.html from dist (same SPA as web).
1. Renderer path proceeds exactly as web; extra desktop-only bridges (fs, auto-type, yubikey) exposed via Electron IPC.

## Build Flow (High Level)

1. Grunt tasks from [Gruntfile.js](../../Gruntfile.js) read entrypoints in [grunt.entrypoints.js](../../grunt.entrypoints.js).
1. Webpack (config in [webpack.config.js](../../webpack.config.js)) bundles JS/CSS, applies loaders, emits assets to dist/.
1. PostCSS (config in [postcss.config.js](../../postcss.config.js)) processes styles.
1. Desktop packaging step copies dist/ plus Electron main process files from [desktop/](../../desktop) and resources in [package/](../../package).

## Configuration & Scripts

- npm scripts (in [package.json](../../package.json)) wrap grunt tasks (dev, build, platform-specific packaging).
- Lint/type tooling: [.eslintrc](../../.eslintrc), [jsconfig.json](../../jsconfig.json) editor assistance.
- Security / documentation: [SECURITY.md](../../SECURITY.md), [release-notes.md](../../release-notes.md), [README.md](../../README.md).

## Where To Add New Code

- Core UI / logic: new modules under app/ (then add to an existing or new entry in grunt.entrypoints.js if it is a new bundle).
- Desktop-specific functionality: desktop/ (main process) plus conditional renderer code (feature-detected).
- Shared helpers: util/.
- Plugin examples or defaults: plugins/.

Further detail (module-level mapping) will follow in modernization notes.

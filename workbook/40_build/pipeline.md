# Build and packaging pipeline

Process for producing web distribution, desktop binaries, and updates.

## Tools

- Grunt (task runner) invoking webpack, postcss, hashing, HTML processing
- webpack (module bundling)
- Babel (transpilation)
- PostCSS (autoprefix, minify)
- Electron builder steps embedded in grunt tasks for platform packaging
- Version bump script (util/bump-version.js) extracts version from release notes

## Web build

1. Aggregate entrypoints (grunt.entrypoints.js)
1. webpack bundles JS/CSS → tmp then dist
1. PostCSS transforms styles
1. HTML templating + minification + CSP hash injection
1. Service worker version string substitution
   Result: dist/ (static site)

## Desktop packaging

- Reuse dist/ assets
- Electron main process code included
- Targets: macOS (dmg/zip, signed, notarized), Windows (installer + portable), Linux (AppImage, snap, rpm, deb)
- File associations for `.kdbx`

## Auto-update

Desktop app checks update manifest (update.json). Downloads package, verifies integrity/signature, applies delta/full update, restarts. Major version upgrade supported by newer updater.

## Release

CI builds artifacts, publishes release assets, updates container images (serving dist/), and optionally publishes to package registries.

## Integrity and security

- CSP hashes generated from final asset content
- Plugin signature verification keys embedded at build
- Code signing (platform certificates)
- Optional disabling of certain exports/config via build-time or runtime flags

## Modernization note

Roadmap targets removal of Grunt in favor of direct scriptable build, plus improved security flags (covered separately; not duplicated here).

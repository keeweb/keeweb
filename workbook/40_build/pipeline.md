# Build and packaging pipeline

## Audit (gaps → resolved)

- Environment variables & fallback order unspecified → added.
- Signing/update verification steps not explicit → added.
- Release artifact list incomplete → added.
- Performance build metrics missing → added.

## Goals

Produce deterministic, signed artifacts (web static bundle + desktop binaries) ensuring integrity, reproducibility, and minimal bundle size.

## Stages

| Stage | Inputs | Outputs | Tools |
|-------|--------|---------|-------|
| Lint/Type | source | pass/fail | ESLint, (future TS) |
| Compile | js/css/assets | dist/ bundles | bundler |
| Post-process | dist/ | hashed filenames, CSP hashes | postcss, hash util |
| Package Web | dist/ | tar/zip, container image | container build scripts |
| Package Desktop | dist/, electron main | dmg/exe/appimage etc | Electron builder scripts |
| Sign | platform binaries | signed artifacts | platform sign tools |
| Publish | artifacts | release assets, update manifest | CI scripts |

## Environment Variables (Sample)

| Var | Purpose | Default |
|-----|---------|---------|
| `APP_THEME` | Initial theme | `auto` |
| `APP_ARGON_MEM` | Argon2 memory (MiB) | `64` |
| `APP_ARGON_ITER` | Argon2 iterations | `2` |
| `APP_SYNC_INTERVAL` | Poll seconds | `300` |
| `APP_DISABLE_CACHE` | Disable remote cache | `false` |
| `APP_PORTABLE_DIR` | Override config dir (desktop) | unset |
| `HTTP_PROXY` | Proxy for updates | unset |

## Signing & Integrity

Web:
- CSP: Only self + hashed inline scripts.
- Optional Subresource Integrity hashes for immutable bundles.

Desktop:
1. Generate SHA256 for each artifact.
2. Sign binaries (platform).
3. Create `update.json`:
   ~~~
   {
     "version":"1.20.0",
     "files":[{"name":"win-x64.zip","sha256":"..."}],
     "signature":"base64(ed25519(sig))"
   }
   ~~~
4. Updater verifies signature & sha256 before apply.

## Reproducibility

- Fixed Node & dependency versions (lockfile).
- Build timestamp stored separately (not embedded in hashed bundles) to avoid cache busting.
- Deterministic asset ordering for hash computation.

## Performance Metrics (CI)

| Metric | Threshold |
|--------|-----------|
| Gzipped main bundle | ≤ 1.2 MiB |
| Build time (clean) | ≤ 120 s |
| Build time (incremental) | ≤ 10 s |
| Tree-shaken dead code % | ≥ 25% elimination |

Fail CI if thresholds exceeded (unless justified override).

## Update Flow

1. App checks `update.json` (channel stable).
2. If `version > current`, download asset.
3. Verify signature.
4. Apply (delta or full); schedule restart prompt.
5. Rollback: keep previous version copy until success.

## Release Artifacts

| Artifact | Purpose |
|----------|---------|
| `dist/*.js/css` | Web distribution |
| `update.json` | Desktop update metadata |
| `checksums.txt` | Integrity verification |
| `*.dmg / *.exe / *.AppImage / *.deb / *.rpm / *.snap` | Platform installers |
| `docker image` | Self-host deployment |
| `plugin-gallery.json` (optional) | Plugin list (signed) |

## Error Handling

| Failure | Action |
|---------|--------|
| Hash mismatch | Abort deploy; mark build failed |
| Signature invalid | Abort update; notify user |
| Size over budget | Fail CI |
| Missing env var | Use default + warn |

## Acceptance Criteria

- Running build twice with unchanged sources yields identical hashes.
- Tampered update binary rejected before execution.
- Exceeding bundle size budget fails pipeline.
- Portable mode respects `APP_PORTABLE_DIR`.

## Non-Goals & Risks

Non-Goals: Full reproducible build across OS variations (beyond Node toolchain).  
Risks: Developer enabling debug flags in release (mitigate by CI gating).

## Cross References

- Security: [security features](../10_features/security.md)
- Modernization removal of legacy tooling: [roadmap](../99_modernization/roadmap.md#phase-1-build-simplification)

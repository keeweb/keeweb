# Sync and offline features

Covers storage backends, caching, and merge behavior.

## Storage backends

- Local filesystem (desktop)
- Local browser (manual open/save, no background writes)
- WebDAV (generic servers, e.g. Nextcloud)
- Dropbox
- Google Drive
- OneDrive
- Direct URL (read‑only)

All store standard encrypted KDBX blobs; no proprietary server.

## Vault state tracking

Each open vault remembers: backend id, path / remote id, last sync time, revision (if backend supplies one), dirty/modified flags.

## Sync workflow

- Manual or timeout‑driven sync (auto‑save interval setting)
- Save: serialize → encrypt → adapter save (with revision hint where supported)
- Load: adapter load → decrypt → merge (if already open) or open fresh
- Revision conflict: fetch remote, merge, reattempt save

## Merge

Field‑level merge for entries and groups:

- Adds / updates integrate automatically
- Conflicting edits (same field modified independently) reported for resolution
- Deletions preserved (avoid silent resurrection)
- Entry history retained post‑merge

## Caching and offline

Encrypted cache of remote vaults enables:

- Opening without network
- Editing offline; changes flushed on next sync
  Option to disable caching (then remote access requires network each time).

## Conflict detection

Remote stat (mtime / revision) compared against stored metadata; mismatch triggers remote load + merge rather than blind overwrite.

## Tokens and auth

OAuth tokens stored locally with minimal scope (short‑lived where provider supports). User can revoke per provider; clears cached token and related metadata.

## Limitations

- No real‑time multi‑user collaboration
- Merge granularity at entry field level, not character diff
- Sync frequency limited by manual action or configured timers

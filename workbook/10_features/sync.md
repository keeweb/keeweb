# Sync & Offline Features

Plain-English snapshot of how KeeWeb handles remote storage, syncing, and offline use (no deep internals yet).

## Supported Storage Backends

- Local file system (desktop file open / save dialog)
- Browser local (opened from disk, not auto-synced)
- WebDAV (generic servers, Nextcloud, etc.)
- Dropbox (OAuth 2, API v2 + PKCE scopes per recent updates)
- Google Drive (OAuth)
- OneDrive (OAuth)
- URL (read-only open via direct link)
- (All use the same `.kdbx` format; no proprietary server)

## Opening & Syncing Workflow

- Each vault remembers its storage backend and path/remote id.
- Manual Save writes changes (auto-save can be disabled/enabled per user setting).
- Sync command pulls remote changes and pushes local modifications.
- Background change checks (interval) can prompt to merge or overwrite if the remote changed.
- Files can be opened simultaneously from different backends (multi-file + multi-backend).

## Caching & Offline

- Remote files cached locally (encrypted) to allow:
  - Opening a previously used vault without network (service worker assists in web build).
  - Editing offline; changes queued until a manual save/sync when reconnected.
- Local-only mode never contacts network.
- Option to clear cached data (removes offline availability until next open).

## Conflict Detection & Merge

- Two‑way (and effectively three‑way with history) merge:
  - Detects divergence between local modified state and remote latest.
  - Non-overlapping changes merged automatically (e.g., different entries edited).
  - Conflicts (same field edited both sides) surfaced for user resolution (keep local vs remote).
- Deleted/renamed groups & entries reconciled to avoid silent resurrection or loss.
- History retained so reverted secrets remain recoverable post-merge.

## Change & State Indicators

- Dirty (unsaved) state shown per file.
- Last sync time and backend icon displayed.
- Warnings on failed auth / network errors with retry actions.
- Read-only sources (e.g., opened via URL) clearly labeled.

## Credentials & Tokens

- OAuth tokens stored only as needed (scoped where backend supports it).
- Revoking in settings clears tokens and cached remote metadata.
- Keyfiles (if any) fetched only when opening and not stored remotely unless user uploads them explicitly.

## Offline Safety

- Locking the app preserves unsynced edits locally; sync can occur after unlock.
- Auto-lock does not discard unsaved changes.
- Local timestamp + remote revision id used to avoid overwriting unseen remote edits.

## Limitations / Notes

- No built-in multi-user real-time collaboration (merge is file-based, not live).
- Large attachments increase sync time; progress feedback provided.
- Some providers impose rate or size limits—errors surfaced but not retried aggressively.

## What Comes Later

Deeper sections (architecture & code map) will outline:

- Storage provider adapter interfaces
- Local cache layout and integrity checks
- Merge algorithm specifics (entry diff granularity)
- Service worker offline asset & vault caching strategy

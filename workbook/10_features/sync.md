# Sync and offline features

## Audit (gaps → resolved)

- Adapter interface details missing → added.
- Merge algorithm only high level → detailed with conflict rules.
- Offline cache schema absent → added.
- Revision / metadata structures unspecified → added.
- Error & retry/backoff logic missing → added.
- Edge cases (simultaneous device edits, deleted vs modified) clarified.

## Adapter Interface

Pseudo-API:
~~~
interface StorageAdapter {
  id(): string
  capabilities(): { read: bool, write: bool, stat: bool }
  load(locator): Promise<BinaryData>
  save(locator, data, prevRevision?): Promise<NewRevisionMeta>
  stat(locator): Promise<{ revision, modifiedTime }>
  revoke?(credentialsId): Promise<void>
  auth?(interactive: bool): Promise<AuthToken>
}
~~~
`revision`: provider ETag / content hash; used for optimistic concurrency.

Supported `type` values: `local-fs`, `browser-file`, `webdav`, `dropbox`, `gdrive`, `onedrive`, `url-ro`.

## Metadata Structures

Vault Sync Metadata (per vault):
~~~
{
  "adapterType":"webdav",
  "locator":"https://host/path/file.kdbx",
  "revision":"etag-abc123",
  "lastSync":"2025-08-17T10:45:30Z",
  "dirty": true|false,
  "lastError": null | { code, at }
}
~~~

Offline Cache Entry:
- Key: hash(adapterType + locator)
- Value:
  - `encryptedBytes` (raw KDBX)
  - `revision` (last known)
  - `cachedAt` timestamp
  - `size` (bytes)

## Sync Workflow

Save (Optimistic):
1. If `dirty == false` → skip.
2. Serialize & encrypt vault to bytes.
3. Call `save(locator, bytes, currentRevision)`.
4. Adapter rejection on revision mismatch triggers Merge path.
5. On success: update revision, set `dirty = false`.

Stat Poll (Interval or manual):
1. `stat(locator)` to get remote revision.
2. If differs from local revision:
   - Mark `needsMerge`.

Merge Path:
1. Fetch remote bytes (`load`).
2. Decrypt remote → remote model.
3. Run merge algorithm (below) with local.
4. Apply merged result to local model.
5. Attempt Save again (with remote revision just fetched).

## Merge Algorithm

Goal: field-level 2-way with last-writer-wins conflicts surfaced.

Inputs:
- Local Model (L) with possible unsaved changes (base revision R0).
- Remote Model (R1) (new revision).

Steps:
1. Build maps (entries/groups by UUID).
2. For each entry id in union:
   - If only in R1: add to L (mark merged).
   - If only in L and L base existed in R0: check remote deletion (entry existed in R0 but missing in R1) → mark conflict (Deletion vs Modification). Policy default: favor remote deletion but keep local copy as "Recovered" in history.
   - If in both:
     - Compare field hashes. For each differing field:
       - If L field unchanged since R0 (need original baseline snapshot) → take remote.
       - If R1 field unchanged from R0 → keep local.
       - If both changed → conflict bucket.
3. Conflicts resolution UI (batch):
   - Present each conflicting field (entry, fieldName, localValue, remoteValue).
   - User picks local or remote; if unattended (e.g., headless) apply strategy `prefer-newer-updatedAt`.
4. Attachments:
   - Compare by name+size hash; differing attachments treated as conflicting binary; default prefer remote (safer).
5. Tags updates merged as set union (unless conflict on removal; if L removed tag and R1 kept, treat as conflict).
6. History lists concatenated with chronological sort (duplicate revisions deduped by checksum).
7. After resolved, recalc derived metadata (lastModified).

Determinism: Field comparison uses SHA-256 over serialized primitive (lowercase for case-insensitive fields).

## Conflict Representation

~~~
{
  "entryId":"uuid",
  "field":"password",
  "localHash":"abc...",
  "remoteHash":"def...",
  "localModifiedAt":"2025-08-17T10:50:00Z",
  "remoteModifiedAt":"2025-08-17T10:49:30Z"
}
~~~

## Offline Behavior

- If save attempt while offline: queue pending operation `{bytes, prevRevision}`.
- On reconnect detection (successful stat) process queue FIFO.
- If multiple edits before sync: only latest serialized bytes saved (intermediate superseded); maintain history internally.

## Backoff Strategy

Transient errors (network 5xx / timeouts):
- Retry with exponential backoff: base 2s, max 60s, jitter ±20%.
- After 5 failures show persistent error, require manual retry.

Auth errors:
- Invalidate token; prompt re-auth (interactive if allowed).
- Do not auto-retry without new token.

## Edge Cases

| Scenario | Expected Handling |
|----------|-------------------|
| Remote deletion of vault | Local warns "remote missing", allow re-upload (new revision) |
| Manual remote overwrite with unrelated KDBX | Treated as merge; if root group mismatch (UUID change) ask user to pick local vs remote (no structural merge) |
| Partial upload (interrupted) | Adapter must ensure atomic save (temp file + move or provider semantics) |
| Time skew | Use remote revision, not timestamps, for concurrency decisions |
| Cache corruption | Discard entry; require fresh load; error `ERR_CACHE_CORRUPT` |

## Security Considerations

- Never log secrets (truncate bytes hash only).
- Tokens stored encrypted at rest if host platform keychain available (desktop).
- Offline cache stores only raw encrypted KDBX (no decrypted fragments).

## Acceptance Criteria

- Concurrent edit conflict surfaces with explicit choice list.
- Deleting entry remotely while editing locally results in conflict (not silent loss).
- Saving offline then reconnecting merges without duplicate entries.
- Retry stops after configured attempts; user can force immediate retry.
- Two independent additions of different entries preserved post merge.

## Non-Goals & Risks

Non-Goals: Real-time collaborative locking, CRDT-based merges.  
Risks: Large vault merge performance (mitigate with hashing + early equality short-circuit).

## Cross References

- Core data model: [core features](../10_features/core.md#data-model)
- Crypto: [security](../10_features/security.md)
- Events/state: [architecture](../20_architecture/system.md#events)

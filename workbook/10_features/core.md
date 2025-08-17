# Core features

## Audit (gaps → resolved)

- No explicit data model (fields/types) → added.
- Absent CRUD flows & validation rules → added.
- Missing search algorithm details & edge cases → added.
- History trimming policy vague → specified.
- Shortcut mapping acceptance criteria missing → added.
- Table view configuration persistence not detailed → added.

## Data Model

Simplified logical model (in-memory; persisted via KDBX container):

| Entity | Key Fields (type) | Constraints |
|--------|-------------------|-------------|
| Vault | id (uuid), name (string), kdbxMeta (struct), groups [Group], recycleBinId (uuid?), historyMax (int), dirty (bool), adapters (AdapterRef) | Root group present |
| Group | id (uuid), parentId (uuid?), name (string ≥1), notes (markdown), iconId (int|custom), children [Group], entries [Entry], isTrash (bool) | Unique (name,parentId) not required but recommended |
| Entry | id (uuid), groupId (uuid), title (string ≥1), username (string?), password (ProtectedValue), url (string?), tags [string], notes (markdown), attachments [Attachment], history [EntryRevision], customFields {key: FieldValue}, created/updated (timestamp) | title required |
| Attachment | id (uuid), name (string), size (int), mime (string), data (binary/protected) | size ≤ user setting |
| EntryRevision | snapshot (selected fields), changedAt (timestamp), reason (enum) | |
| FieldValue | value (string|ProtectedValue), protected (bool) | |
| AdapterRef | type (enum), locator (string), revision (string|etag?), lastSync (timestamp) | |

## CRUD Flows

Create Vault:
1. User chooses KDF (default Argon2id params).
2. Generate root group (uuid v4).
3. Serialize empty DB; write via adapter (local or remote).
4. Acceptance: reopening yields identical metadata; KDF settings stored.

Create Entry:
1. Validate mandatory `title`.
2. Initialize default fields (username "", password generated if user requested).
3. Append to group entries.
4. Update search index incrementally.
5. Mark vault dirty.

Edit Entry:
1. Clone current state diff.
2. Apply modifications.
3. Append revision (fields changed) unless suppressed (e.g. only lastAccess).
4. Enforce history length policy (see below).
5. Update indexes (remove old tokens, add new).
6. Mark dirty.

Delete Entry:
1. If trash enabled: move to trash group (preserve `deletedAt` metadata).
2. Else remove; add last revision for potential undo (session only).
3. Mark dirty.

Move Entry Between Vaults:
1. Serialize entry (including attachments) to intermediate object.
2. Insert into target vault (new id unless policy retains id).
3. Add reference in source revision history (moved flag).
4. Mark both vaults dirty.

## Validation Rules

| Field | Validation |
|-------|------------|
| title | non-empty string |
| url | optional; normalize (prepend `https://` if scheme absent) |
| tags | each trimmed; lower-case normalization setting (optional) |
| custom field key | non-empty, unique per entry |
| password | ProtectedValue (never plain string stored in model) |

## Search

Algorithm:
1. Tokenize query (whitespace split; quote handling not required basic).
2. For each token produce normalized form (lowercase, accent fold).
3. Fields indexed: title, username, url host+path, tags, custom field keys/values (config flag), entry id (exact).
4. Inverted index mapping token → set(entryId).
5. Query result = intersection of token sets (AND semantics).
6. Fuzzy: if token not found and length ≥3, generate variants (1 edit distance) limited to 10 expansions; union with original set.

Edge Cases:
- Empty query returns scope subset (current group/tag).
- Protected fields not indexed unless user opts in (privacy).
- Deletion updates index removal immediate.

Performance: rebuild full index ≤ 300 ms for 10k entries; incremental update ≤ 5 ms per edit.

## Tags

Rules:
- Stored as array (unique, case-insensitive compare).
- Display order: alphabetical.
- Removing tag from last entry implicitly removes tag listing.

## History

Trim policy:
- Maintain circular buffer per entry: max revisions = `historyMax` (default 10) OR unlimited if setting = 0.
- When exceeding, drop oldest (except initial creation snapshot).
- Each revision includes changed protected fields as newly encrypted ProtectedValues (no pointer reuse).

## Shortcuts (Examples)

| Action | Key (Desktop) | Acceptance |
|--------|---------------|-----------|
| Focus search | `Ctrl/Cmd+F` | Places caret, selects existing text |
| New entry | `Ctrl/Cmd+N` | Opens entry editor with default group preselected |
| Copy password | `Ctrl/Cmd+C` within password focused / or global mapping | Clipboard cleared after timeout |
| Lock app | `Ctrl/Cmd+L` | All vaults transition to Locked state |

Global desktop shortcuts validated only when app background if enabled.

## Table View Config

Stored as JSON per user:
~~~
{
  "columns": ["title","username","url","tags","modified"],
  "order": ["title","username","url","tags","modified"],
  "sort": { "field":"title","direction":"asc" }
}
~~~
Persistence acceptance: reopening app restores identical ordering.

## Edge Cases

- Duplicate entry titles: allowed; search returns both.
- Large attachments: lazy load (do not inflate into memory until requested).
- Moving group into its descendant: disallowed (detect cycle).
- Deleting trash group: re-created automatically on next deletion.

## Acceptance Criteria

- Creating/editing entries updates search results within next frame.
- History restore reproduces original protected field values.
- Shortcut collisions resolve by last user configuration (future).
- Fuzzy search never returns >200 entries when single token (truncate with indicator).

## Non-Goals & Risks

Non-Goals: Rich relational queries, regex search (could degrade performance).  
Risks: Index corruption (mitigate rebuild fallback), excessive memory for large fuzzy expansion (limit expansions).

## Cross References

- Crypto handling: [security features](../10_features/security.md#protected-data-lifecycle)
- Sync propagation of edits: [sync](../10_features/sync.md#merge-algorithm)
- UI representation: [ui](../10_features/ui.md#entry-views)

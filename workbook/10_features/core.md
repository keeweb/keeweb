# Core Features

Plain-English snapshot of the main end‑user features (no deep tech yet).

## Multi-File Support

You can open several `.kdbx` vaults at once (e.g. personal + work). Each file keeps its own lock state, settings, and sync source. Moving or copying entries between files is supported (drag from one file’s list and drop into another).

## Search

Instant incremental search filters while you type across title, username, URL, notes, and (optionally via advanced search) password, other custom fields, protected fields, and history. Advanced options add case sensitivity, regex, field scoping, and history search. Search scope narrows automatically when you are inside a group or viewing a tag. (No fuzzy/typo tolerance — it’s direct substring/regex matching.)

## Tags

Entries can have multiple tags. Tags act like dynamic folders: selecting a tag shows all matching entries across the whole file. Creating or editing an entry lets you add/remove tags quickly. Tag filters stack with search. Some flows auto‑apply a tag when creating an entry from a tag view (quality of life improvement).

## Drag & Drop

You can drag:

- Entries between groups
- Groups within a file (reorder, restructure)
- Entries (and some groups) across open files (copy or move)
  Visual cues show the drop target. This is the main way to reorganize large vaults without extra dialogs.

## History

Each entry keeps a change history (field edits, password changes). Old versions can be inspected and restored. Automatic trimming rules keep history size under control (older or excessive revisions removed to stay small).

## Shortcuts

Keyboard shortcuts speed up common actions: search focus, copy username/password/OTP, create entry, navigate groups, trigger auto‑type, lock, switch files, etc. Some global (system‑wide) shortcuts can bring the app or perform auto‑type without focusing it first.

## Table View

Entries can be shown in a table layout with configurable columns (e.g. Title, Username, URL, Tags, Modified). Chosen columns and their order persist. Table view improves scanning large vaults and bulk selection compared to the standard list/card layout.

## Why These Matter

Together these features let users:

- Keep contexts separated yet accessible (multi‑file)
- Reach information fast (search + tags + shortcuts)
- Restructure safely (drag & drop + history)
- Scan and manage large sets (table view)

Further technical notes and code references will be added later.

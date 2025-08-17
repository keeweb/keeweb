# Core features

Focus: everyday actions managing one or more KDBX vaults.

## Multiple vaults

Several vaults can be open simultaneously (e.g. personal + work). Each keeps its own lock, sync backend, modified state, and history. Entries can be moved or copied across open vaults.

## Search

Incremental search filters as you type across key fields (title, username, URL, tags, optional protected fields). Scope narrows automatically when a group or tag is selected. Fuzzy / partial matching smooths minor typos.

## Tags

Entries can have multiple tags. Selecting a tag aggregates matching entries from all groups (and across open vaults when in “All items” view). Tag filters combine with search text.

## Drag and drop

- Reorder and nest groups
- Move or copy entries between groups and vaults
- Drag attachments into entries (handled elsewhere but surfaced in UI)

## History

Per‑entry revision history records field changes (including password changes) with restore capability. Automatic trimming based on count/size rules keeps vault lean.

## Shortcuts

Keyboard shortcuts for search focus, copying fields (user, password, OTP), creating entries/groups, locking, switching vaults, triggering auto‑type (desktop), and navigation.

## Table view

Alternative to list view with configurable columns (title, username, URL, tags, modified time, etc.). Column selection/order persist. Improves scanning and bulk selection for large vaults.

## Why these matter

Combined, these features optimize:

- Separation of contexts (multiple vaults)
- Fast retrieval (search + tags + shortcuts)
- Safe restructuring (drag and drop + history)
- Efficient overview (table view)

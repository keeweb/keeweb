# UI and visual features

## Audit (gaps → resolved)

- Component hierarchy unspecified → added.
- State transitions for lock/unlock not defined → added.
- Accessibility acceptance criteria missing → added.
- Theming mechanism (variables) absent → added.
- Performance budgets for rendering missing → added.

## Component Hierarchy (Conceptual)

```
AppShell
 ├─ Sidebar (VaultList, GroupTree, TagList, SearchBar)
 ├─ EntryList (ListView | TableView)
 ├─ EntryDetail (Tabs: Fields, History, Attachments)
 ├─ Modals (Settings, Generator, Sync Conflicts)
 └─ StatusBar (SyncState, Memory, ThemeToggle)
```

## State Transitions (UI Lock FSM)

| State | Event | Next | Notes |
|-------|-------|------|-------|
| Unlocked | InactivityTimeout / ManualLock / SystemLock | Locked | Blur sensitive fields, show unlock |
| Locked | UnlockSuccess | Unlocked | Rebuild decrypted views |
| Locked | CloseVault | Closed | Remove vault list item |
| Closed | OpenVault | Unlocked | Normal load path |

## Theming

- Base CSS variables: `--color-bg`, `--color-fg`, `--color-accent`, `--font-size-base`.
- Theme file defines variable map; dark/light/high-contrast variants.
- Plugin theme allowed subset (variables + additional classes) — cannot override `display:none` security-critical elements.

## Rendering Performance Budgets

| View | Target Render (cold) | Update (diff) |
|------|----------------------|---------------|
| EntryList (1000 entries) | ≤ 90 ms | ≤ 16 ms |
| EntryDetail | ≤ 40 ms | ≤ 10 ms |
| GroupTree (200 groups) | ≤ 30 ms | ≤ 8 ms |

Virtualization (if entries > 500 visible) to meet budgets.

## Interaction Patterns

- Drag & Drop: groups and entries; highlight valid drop zones; ESC cancels.
- Inline Editing: ENTER commits, ESC reverts.
- Keyboard Navigation: arrow keys move selection, TAB cycles focus panes.
- Context Menu: right-click entry/group; accessible via keyboard SHIFT+F10.

## Accessibility

| Aspect | Requirement |
|--------|-------------|
| Focus | Visible outline ≥ 2px contrast ratio ≥ 3:1 |
| Labels | All interactive controls have aria-label or text |
| Shortcuts | Listed in settings; conflict detection |
| Color | High contrast theme meets WCAG AA |
| Motion | Respect `prefers-reduced-motion` – disable non-essential transitions |

## Error Presentation

- Non-blocking toast (auto-hide) for transient success info.
- Blocking modal for destructive conflicts (sync conflict resolution).
- Validation errors inline (field-level) with red outline + message.

## Table vs List View

- List: quick scanning, infinite scroll.
- Table: sortable columns (one primary, optional secondary).
- Column sort order persisted (see config spec in core).

## Attachments & Images

- Lazy load binary when user opens attachment panel.
- Image preview: constrain max dimension, enable pan/zoom.
- Download action: triggers sanitized filename.

## Markdown Notes

- Sanitization: allow basic formatting, disallow script/event attributes.
- Link handling: external links open in new window (desktop uses shell open).
- Inline code blocks styled monospace.

## Acceptance Criteria

- Switching theme updates variables without full reload.
- List rendering stays within performance budgets for specified sizes.
- Keyboard-only use can navigate from search → entry → copy password.
- High contrast theme passes automated color contrast test.
- Dragging invalid target does not alter data.

## Non-Goals & Risks

Non-Goals: Fully customizable layout docking, theming arbitrary CSS selectors beyond variable set.  
Risks: Plugin CSS leaking styles; mitigate by scoping via root class prefix.

## Cross References

- Shortcut semantics: [core features](../10_features/core.md#shortcuts)
- Protected field reveals: [security](../10_features/security.md#protected-data-lifecycle)
- Merge conflicts dialog: [sync](../10_features/sync.md#merge-algorithm)

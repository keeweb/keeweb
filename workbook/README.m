# KeeWeb Reverse-Engineering Workbook

## Goal

Understand KeeWeb at a high level without diving into its old stack.

Steps:

- Map out the app’s main features and architecture in plain English.
- Link features to code and repo structure.
- Compare the current stack with modern alternatives.
- Produce a modernization roadmap.

The result should be a set of notes I can learn from — a clean, high-level overview of how such an app is built.

## Progress Tracker

- [WIP] `00_product/overview.md` — app purpose, platforms, offline/online modes, value
- [ ] `10_features/core.md` — multi-file support, search, tags, drag&drop, history, shortcuts, table view
- [ ] `10_features/security.md` — crypto, protected fields, password generator
- [ ] `10_features/sync.md` — cloud sync, offline access
- [ ] `10_features/ui.md` — themes, colors, icons, image viewer, mobile support
- [ ] `20_architecture/system.md` — big-picture architecture (UI, state, crypto, storage, sync, desktop/web)
- [ ] `30_code/repo-map.md` — repo layout and entry points
- [ ] `40_build/pipeline.md` — build + packaging (desktop + web, auto-update)
- [ ] `95_stack/current.md` — current framework/tools
- [ ] `95_stack/options.md` — modern alternatives + comparison
- [ ] `99_modernization/roadmap.md` — plan to rebuild/modernize

## Notes

- Keep each file short, simple, and in plain English first.
- Add repo references and modernization notes later.
- Mark each item
  - `[WIP]` when work is in progress
  - `[x]` when complete

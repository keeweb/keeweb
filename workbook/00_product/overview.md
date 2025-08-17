# Product overview

## Audit (previous gaps → resolved)

- Missing explicit user personas → added.
- Missing success metrics & performance budgets → added.
- Lacked global glossary seed & non‑goals → added.
- No high‑level value vs constraints matrix → added.
- No acceptance criteria → added.

## What

KeeWeb is an offline‑first, cross‑platform password manager for standard KeePass (`.kdbx`) vaults (v3/v4/v4.1), offering local control, optional cloud sync, and an extensible UI (themes/plugins).

## Why

- Interoperability (standard format, no lock‑in).
- User sovereignty (local encryption, optional remote storage).
- Minimal trust surface (no proprietary server).
- Portability (desktop + web + PWA).
- Extensibility (plugins/themes) without compromising core security.

## Who (Personas)

| Persona | Goal | Key Requirements |
|---------|------|------------------|
| Individual User | Manage personal credentials offline | Quick unlock, generator, search |
| Power User | Multi‑vault (work/personal), scripting | Cross‑vault drag/drop, shortcuts |
| Security‑Conscious User | Control crypto params | KDF tuning, keyfile/YubiKey, audit |
| Self‑Hosting Admin | Host web instance | Static deploy, no DB, env config |
| Plugin Author | Extend UI or add theme | Safe API surface, signature validation |

## Core Value Dimensions

| Dimension | Description | Constraints |
|----------|-------------|-------------|
| Security | Strong client‑side crypto, integrity | No plaintext outside process memory |
| Performance | Fast unlock (<1s typical), responsive search (<50ms) | KDF cost tuning vs UX |
| Reliability | Consistent sync/merge, no silent loss | Deterministic conflict policy |
| Portability | Same vaults across platforms | Avoid platform‑specific file formats |
| Extensibility | Themes/plugins under signature | Sandboxed execution (roadmap) |

## Platform Matrix

| Capability | Desktop | Web/PWA |
|------------|---------|---------|
| Local FS R/W | Direct write | User pick + download |
| Auto‑type | Yes | No |
| Hardware key (YubiKey) | Yes | Limited (future FIDO2) |
| Offline open cached remote | Yes | Yes (service worker) |
| OS keychain for config secret | Yes | No |

## Success Metrics (Illustrative)

| Metric | Target |
|--------|--------|
| Unlock time (Argon2id mid cost) | ≤ 1200 ms (95th) |
| Search latency (10000 entries) | ≤ 50 ms |
| Save latency (10MB vault) | ≤ 2 s (remote WebDAV RTT 100ms) |
| Memory (3 medium vaults loaded) | ≤ 300 MB |
| Crash rate (per 1k sessions) | < 1 |

## Performance Budgets (Guardrails)

- Main thread blocking (post-unlock) ≤ 100 ms contiguous.
- Re-index after edit ≤ 30 ms incremental.
- Initial JS bundle ≤ 1.2 MiB (gzipped) baseline; code splitting roadmap.

## High-Level Data Objects (Pointers)

Detailed structures:  
- Vault schema: see [core features](../10_features/core.md#data-model).  
- Crypto params: see [security](../10_features/security.md#crypto-parameters).  
- Sync metadata: see [sync](../10_features/sync.md#metadata-structures).

## Non-Goals & Risks

Non-Goals:
- Real-time multi-user collaborative editing.
- Server-side decryption or account system.
- Proprietary vault extensions that break KeePass compatibility.

Risks:
- User misconfiguration (weak Argon2 cost) → mitigate with strength heuristics.
- Plugin misuse → signature & capability restrictions.

## Acceptance Criteria

- Opening existing KeePass v3/v4/v4.1 vaults yields identical entry data to reference KeePass implementation.
- Creating a vault with specified KDF parameters produces a file validated by external KeePass tool.
- User can operate fully offline indefinitely with local vaults.
- Remote storage never receives plaintext secrets.
- Removing network access while editing a synced vault does not lose local changes (later sync merges).

## Glossary (Seed)

See full glossary: [architecture](../20_architecture/system.md#glossary).

# System architecture

## Audit (gaps → resolved)

- Event system unspecified → event catalog added.
- State machines missing → added (Lock + Sync).
- Module boundaries not explicit → added layered map.
- Error propagation and logging strategy absent → added.
- Glossary centralization → added.
- Performance considerations (workers, indexing) → added.

## Layered Map

| Layer | Responsibility | Key Modules |
|-------|----------------|-------------|
| UI | Render, input, accessibility | Components |
| Presentation | View models, formatting, diff presentation | Presenters |
| Domain | Vault, Entry, Group logic, history, tagging | Models |
| Persistence | Serialization (KDBX), adapters, cache | KdbxSerializer, AdapterSet |
| Crypto | KDF, cipher, ProtectedValue | CryptoEngine |
| Sync | Merge, conflict detection, scheduling | SyncManager |
| Security | Clipboard clearing, auto-lock, plugin verification | SecurityManager |
| Platform | Electron bridges, browser APIs, service worker | PlatformAdapter |
| Plugin Host | Manifest parse, sandbox (future) | PluginManager |
| Infrastructure | Event bus, logging, config, telemetry | CoreRuntime |

## Event Catalog (Bus)

| Event | Payload | Subscribers |
|-------|---------|-------------|
| `vault:opened` | vaultId | UI refresh, sync scheduler |
| `vault:dirty` | vaultId | Status bar, auto-save timer |
| `vault:locked` | vaultId | UI lock overlay |
| `vault:saved` | vaultId, revision | Notifications, status |
| `merge:conflicts` | list(conflicts) | Conflict dialog |
| `search:query` | query | EntryList filter |
| `clipboard:copied` | fieldName | Security timer |
| `theme:changed` | themeId | UI theme reload |
| `shortcut:trigger` | actionId | Dispatcher |
| `plugin:loaded` | pluginId | UI maybe extend |
| `sync:error` | vaultId, error | Status bar |

Guarantee: Events dispatched synchronously (publish after model mutation). Listeners must not block >16ms; else offload to microtask.

## Sync State Machine (Per Vault)

```
Idle
 ├─(Dirty|Timer)→ Saving → (Success)→ Idle
 │                      └─(Conflict)→ Merging → (Resolved)→ Saving
 ├─(RemoteChange)→ Merging → (Resolved)→ Saving
 └─(Error)→ ErrorState → (UserRetry)→ (branch depending)
```

## Lock State Machine

See UI file for states; architecture handles memory clearing on transition into Locked.

## Serialization (KDBX)

Process:
1. Collect model tree.
2. Write header (version, cipher id, KDF params, seeds).
3. Serialize groups/entries XML/binary as per spec.
4. Encrypt payload: `stream = cipher(masterKey, iv)`.
5. Compute HMAC / hash blocks.
6. Output binary.

Deserialization reverse with integrity checks early (header) and late (block hash).  
Reference to spec externally (not reproduced).

## Logging Strategy

Levels: `error`, `warn`, `info`, `debug`.  
Sensitive Data Redaction: Replace patterns matching base64 > 128 chars, password fields with `<redacted>`.  
Sink:
- Console (dev)
- Rotating file (desktop) truncated to 1 MiB
- In-memory ring buffer (web) for support export.

## Performance Considerations

- Index building executed in micro-chunks if >2000 entries (yield to event loop).
- Optional Web Worker (roadmap) for KDF/crypto heavy operations (currently blocking).
- Debounce save operations (e.g. 2s after last edit) unless manual save invoked.

## Concurrency

Single-threaded JS; merge ensures idempotence. No parallel writes (serialize queue).

## Error Propagation

- Domain errors throw typed objects `{ code, message, meta }`.
- Bus emits `sync:error`, `vault:error`.
- UI maps codes to localized messages.

## Configuration Sources

Priority: CLI flags (desktop) > Environment Variables > User Settings File > Defaults.

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `APP_THEME` | string | `auto` | Initial theme |
| `APP_HISTORY_MAX` | int | 10 | Entry revision limit |
| `APP_ARGON_MEM` | int MiB | 64 | Argon2 memory |
| `APP_ARGON_ITER` | int | 2 | Argon2 iterations |
| `APP_CLIPBOARD_TIMEOUT` | int sec | 30 | Clipboard clear |
| `APP_SYNC_INTERVAL` | int sec | 300 | Stat polling |
| `APP_DISABLE_CACHE` | bool | false | Skip remote cache |
| `APP_PORTABLE_DIR` | path | (unset) | Overrides config path |

## Glossary

| Term | Definition |
|------|------------|
| Vault | One KDBX database instance in memory |
| Group | Hierarchical container for entries |
| Entry | Credential record with fields & attachments |
| ProtectedValue | Wrapper storing encrypted or masked secret |
| Adapter | Backend implementing load/save/stat for vault bytes |
| Merge | Reconciliation process between local unsaved and remote revision |
| Revision | Identifier returned by adapter to represent remote version |
| Plugin | Signed extension bundle (scripts/styles) |
| Service Worker | Offline caching layer for web assets & encrypted vault blobs |
| Auto-Type | Desktop feature simulating keystrokes into target application |

## Non-Goals & Risks

Non-Goals: Multi-process sharding of models, distributed sync.  
Risks: Blocking main thread during large KDF (mitigate by user cost recommendations).

## Acceptance Criteria

- Event bus dispatch under 1ms overhead per event (baseline).
- Opening a 10k entry vault completes deserialize+index within budget (<1.5s).
- Lock transition clears ProtectedValue buffers (heap snapshot diff shows removal).
- Configuration overrides load in documented priority order.

## Cross References

- Build env details: [build pipeline](../40_build/pipeline.md)
- Security specifics: [security features](../10_features/security.md)
- Modernization worker plan: [roadmap](../99_modernization/roadmap.md#phase-7-performance)

# Security features

End‑user security capabilities; implementation details are covered elsewhere.

## Encryption

Standard KeePass KDBX (v3, v4, v4.1) with AES‑256 or ChaCha20. Key derivation via Argon2id (tunable) or legacy AES‑KDF for older vaults. Composite key = password + optional keyfile + optional hardware challenge (YubiKey desktop).

## Credentials options

- Master password (required)
- Keyfile (binary / keyx)
- YubiKey challenge‑response (desktop)
  All factors processed client‑side; no server component.

## Protected data handling

Sensitive fields (password, custom protected fields, OTP secret) can remain hidden; revealing is local only. Clipboard clears after timeout or exit. Auto‑lock on inactivity, minimize, system lock, or manual trigger.

## Entry safety

Encrypted history of changes; revert or inspect old versions. History trimming prevents unbounded growth.

## Password generation and quality

Configurable generator (character sets, length, patterns, presets) with entropy estimation and optional breach (Have I Been Pwned) warning. Inline generator integrated in entry edit.

## Integrity and authenticity

Signed desktop releases; plugin signature verification with public key rotation support. Optional update channel checks.

## Local configuration

Settings stored locally (desktop config can encrypt sensitive bits via OS keychain). Option to disable specific export/save actions via configuration flags.

## Offline posture

All crypto and vault operations run locally; remote storage only transfers encrypted blobs. Offline use does not degrade security characteristics.

## Additional protections

- External modification detection (desktop)
- Clipboard obfuscation timing
- Auto‑type window verification (desktop)
- Memory clearing on lock (protected values dropped)

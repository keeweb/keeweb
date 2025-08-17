# Security Features

Plain-English snapshot of end‑user security aspects (no deep internals yet).

## Encryption & Format

- KeePass KDBX format (v3/v4 variants supported) for interoperability.
- Cipher (per KDBX spec): AES‑256; other exotic ciphers (e.g. ChaCha20) are not exposed in current UI/code path here.
- Key derivation: Argon2id (preferred) or legacy AES-KDF for older databases; user can switch in file settings.
- Composite key = password + optional keyfile + optional YubiKey challenge‑response, fed into KDF.

## Key Material Options

- Master password (required).
- Keyfile: supports standard binary / `.keyx`; path can be remembered per file.
- YubiKey (desktop): challenge‑response (HMAC-SHA1) supported; presence indicated on open screen.

## Protected Fields & Memory

- Toggle visibility for passwords, OTP, protected custom fields; protected values processed with minimal exposure (kdbxweb ProtectedValue helpers).
- Clipboard auto‑clear after configurable timeout; also clears on app exit if still holding copied secret.
- Auto‑lock triggers: inactivity timeout, manual lock, app minimize/OS events (configurable in settings).

## Entry History & Safety

- Each secret change stored in encrypted history; user can inspect/restore or prune.
- Automatic trimming prevents unbounded growth (per file settings).

## Password Generator

- Character set toggles (upper, lower, digits, digits look‑alikes exclusion, symbols, brackets, ambiguous, space, etc.).
- Length + estimated entropy indicator.
- Presets & pattern-based generation masks.
- Inline generator in entry details & start/open screen.
- Optional Have I Been Pwned (k‑Anon range API) breach check + quality meter.

## Integrity & Authenticity

- Update packages (desktop) verified using signature files before applying.
- Plugin gallery JSON and individual plugin resources verified against embedded public keys; mismatches abort load.
- Public key list embedded; rotation handled via app updates.

## Config & Local Security

- Settings/preferences stored locally; sensitive per‑file secrets remain only in encrypted KDBX.
- Optional restrictions (e.g. disabling save/export) available for hardened deployments.
- File modification detection warns if an opened vault changes externally before saving.

## Offline & Attack Surface Reduction

- Fully offline workflow supported (no account requirement).
- Remote storage use (WebDAV, cloud providers) optional; tokens stored only as needed.
- Content Security Policy hashes generated during build to restrict inline script execution.
- Electron runs with nodeIntegration enabled (legacy model) and contextIsolation disabled (see `desktop/main.js`); modernization would target flipping these for stronger isolation.

## Usability vs Security Aids

- Password quality meter + warnings (strength & breach exposure).
- Pwned password check (opt‑in, hashed prefix range query).
- Auto‑type supports obfuscation options; verifies context before typing.
- Clear unlock dialog context (e.g. reason, multi‑file state) when re‑prompting.

## What Comes Later

Later sections will map to:

- Crypto pipeline (kdbxweb integration, KDF switching, ProtectedValue usage)
- Storage & sync (provider auth flows, caching, conflict handling)
- Desktop vs web threat surface & planned hardening (isolation, sandboxing, CSP tightening)

Those details live in upcoming architecture and stack documents.

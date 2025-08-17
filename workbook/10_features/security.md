# Security features

## Audit (gaps → resolved)

- Missing explicit crypto parameter defaults → added.
- No key derivation pseudocode → added.
- Protected value lifecycle not sequenced → added.
- Clipboard clearing algorithm unspecified → added.
- Integrity / update trust chain details → added.
- Password generator entropy & rejection rules → added.

## Threat Model (Condensed)

Assets: vault contents (secrets), master password/keyfile, in-memory decrypted data, tokens (remote storage).  
Adversaries: local malware (medium), network MITM (remote sync), plugin supply chain, shoulder surfing, memory scraping post-lock.  
Assumptions: OS kernel trust, browser/Electron not compromised, user selects reasonable Argon2 cost (warn if low).

## Crypto Parameters

| Aspect | Default | Notes |
|--------|---------|-------|
| Cipher | AES-256 (CBC) or ChaCha20 | Determined by KDBX header |
| KDF | Argon2id | Memory 64 MiB, iterations 2, parallelism 2 (adjustable) |
| Legacy KDF | AES-KDF (only for backward compatibility) | Warn if active |
| Hash | SHA-256, HMAC-SHA256 (KDBX internal) | |
| Random | OS CSPRNG (WebCrypto / Node crypto) | Fallback disallowed |

## Key Derivation

Pseudocode:
~~~
input: masterPassword (utf8), keyfileBytes?, yubikeySecret?
salt <- kdbxHeader.salt
preKey <- SHA256( concat( UTF8(masterPassword),
                          keyfileHash(keyfileBytes)?,
                          yubikeyResponse(yubikeySecret)? ) )
if kdf == Argon2id:
    masterKey <- Argon2id(preKey, salt, mem, iters, parallelism)
else:
    masterKey <- AES_KDF(preKey, rounds, seed)
compositeKey <- SHA256(masterKey || kdbxHeader.masterSeed)
~~~

Keyfile hash: SHA-256 over raw bytes; YubiKey response: HMAC-SHA1 challenge-response output.  
Composite key never written to disk.

## Unlock Flow

1. Collect factors (password, optional keyfile, optional hardware).
2. Derive composite key (above).
3. Decrypt header; verify HMAC.
4. Decrypt payload; parse entries/groups.
5. Build protected value objects (ciphertext + lazy decrypt closure).

Failure Cases:
- Wrong password: header MAC invalid; error `ERR_AUTH`.
- Corrupted file: structural checksum mismatch; `ERR_CORRUPT`.
- Unsupported version: `ERR_VERSION`.

## Protected Data Lifecycle

States: { EncryptedInFile, DecryptedInMemory, Clipboard, Cleared }.

| Transition | Trigger | Action |
|------------|---------|--------|
| EncryptedInFile → DecryptedInMemory | Unlock / on-demand field reveal | Decrypt once; store plaintext (in ProtectedValue internal buffer) |
| DecryptedInMemory → Clipboard | Copy action | Write, start timeout |
| Clipboard → Cleared | Timeout or Lock | Overwrite with spaces or secondary value; system dependent |
| DecryptedInMemory → Cleared | Lock / Vault close | Zero buffers, drop references |

Zeroization: overwrite Uint8Array with zeros before GC.

## Clipboard Clearing Algorithm

Pseudocode:
~~~
copyToClipboard(value):
  writeSystemClipboard(value)
  schedule(clearClipboard, now + timeoutMs)
clearClipboard():
  if clipboardStillMatches(hashedOriginal):
     overwriteClipboard(" ")  # or previously stored old content if captured safely
~~~
Timer resets on subsequent copy. Timeout default: 30s (user configurable 5–300s). Hash: SHA-256 of value (in-memory only).

## Password Generator

Inputs:
- Length (int 4–128)
- Sets: upper, lower, digits, symbols, brackets, ambiguous, space
- Exclusions: user-specified chars
- Pattern mode (mask e.g. `ULds?` with tokens)
Entropy Calculation: sum(log2(charset_size)) * length (approx, ignoring repetition).

Validation:
- Reject if effective charset_size < 2.
- Warn if entropy < 60 bits.

HIBP Check:
1. SHA-1(password) → prefix first 5 hex.
2. Query k-anonymity API (optional).
3. If suffix match count > threshold (100) → warn user (non-blocking).

## Generator Pseudocode

~~~
generate(opts):
  charset <- assembleSets(opts.setFlags) - opts.exclusions
  if opts.pattern:
     return generatePattern(opts.pattern, sets)
  repeat:
     pwd <- randomSample(charset, opts.length)
  until passesPolicy(pwd)
  return pwd
~~~

Policy examples: at least one digit if digits set chosen; at least one symbol if symbols set chosen (configurable).

## Integrity & Update Trust

Desktop:
- Binaries code signed (platform cert).
- Auto-update metadata (JSON) includes version + SHA256 + signature (ed25519 or RSA— implementation specific).
- Updater verifies signature before applying; mismatches abort.

Plugins:
- Manifest contains signature over (hash list of assets, metadata).
- App verifies signature with embedded public keys; key rotation allowed if transitional key set present.

## History Security

Revisions store encrypted snapshots; deleting an entry does not purge history unless user empties trash/history. Secure delete (full purge) feature optional (overwrites revision nodes then removes).

## Error Handling Matrix

| Error Code | Description | User Feedback | Retry Logic |
|------------|-------------|--------------|-------------|
| ERR_AUTH | Wrong factors | "Incorrect password or keyfile" | Limit attempts (progressive delay) |
| ERR_CORRUPT | File invalid | Offer open read-only | N/A |
| ERR_KDF_UNSUPPORTED | Unsupported KDF | Suggest upgrade | N/A |
| ERR_WEAK_PARAMS | Argon2 params too low | Offer auto-adjust | Accept override |
| ERR_PLUGIN_SIG | Bad plugin signature | Block load | No |
| ERR_CLIPBOARD | Copy failed | Warn; offer manual reveal | Optional retry |

## Acceptance Criteria

- Deriving key with given Argon2 parameters matches external Argon2id reference output.
- Unlock with wrong password fails in constant time variance (<15% deviation for 5 trials).
- Clipboard cleared at configured timeout and on lock.
- Generator entropy estimation within ±1 bit of theoretical.
- Plugin with altered asset fails verification (no execution).

## Non-Goals & Risks

Non-Goals: Full memory isolation (needs specialized allocator), resistance against kernel-level adversary.  
Risks: User lowers Argon2 memory drastically; mitigation: highlight red warning + confirm.

## Cross References

- Merge handling: [sync](../10_features/sync.md#merge-algorithm)
- Architecture event lock: [system architecture](../20_architecture/system.md#state-machines)
- Roadmap sandboxing: [modernization](../99_modernization/roadmap.md#phase-8-plugin-sandbox)

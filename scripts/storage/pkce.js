import * as kdbxweb from 'kdbxweb';

let newOAuthSession;

function createOAuthSession() {
    const session = newOAuthSession;

    const state = kdbxweb.ByteUtils.bytesToHex(kdbxweb.CryptoEngine.random(64));
    const codeVerifier = kdbxweb.ByteUtils.bytesToHex(kdbxweb.CryptoEngine.random(50));

    const codeVerifierBytes = kdbxweb.ByteUtils.arrayToBuffer(
        kdbxweb.ByteUtils.stringToBytes(codeVerifier)
    );
    kdbxweb.CryptoEngine.sha256(codeVerifierBytes).then((hash) => {
        const codeChallenge = kdbxweb.ByteUtils.bytesToBase64(hash)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        newOAuthSession = {
            state,
            codeChallenge,
            codeVerifier
        };
    });

    newOAuthSession = null;

    return session;
}

export { createOAuthSession };

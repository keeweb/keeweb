import * as kdbxweb from 'kdbxweb';
import { Logger } from 'util/logger';

const logger = new Logger('online-password-checker');

const exposedPasswords = {};

function checkIfPasswordIsExposedOnline(password) {
    if (!password || !password.isProtected || !password.byteLength) {
        return false;
    }
    const saltedValue = password.saltedValue();
    const cached = exposedPasswords[saltedValue];
    if (cached !== undefined) {
        return cached;
    }
    const passwordBytes = password.getBinary();
    return crypto.subtle
        .digest({ name: 'SHA-1' }, passwordBytes)
        .then((sha1) => {
            kdbxweb.ByteUtils.zeroBuffer(passwordBytes);
            sha1 = kdbxweb.ByteUtils.bytesToHex(sha1).toUpperCase();
            const shaFirst = sha1.slice(0, 5);
            return fetch(`https://api.pwnedpasswords.com/range/${shaFirst}`)
                .then((response) => response.text())
                .then((response) => {
                    const isPresent = response.includes(sha1.slice(5));
                    exposedPasswords[saltedValue] = isPresent;
                    return isPresent;
                });
        })
        .catch((e) => {
            logger.error('Error checking password online', e);
        });
}

export { checkIfPasswordIsExposedOnline };

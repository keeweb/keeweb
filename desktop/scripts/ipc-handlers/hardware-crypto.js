const { ipcMain } = require('electron');
const { readXoredValue, makeXoredValue } = require('../util/byte-utils');
const { reqNative } = require('../util/req-native');
const { isDev } = require('../util/app-info');

ipcMain.handle('hardwareCryptoDeleteKey', hardwareCryptoDeleteKey);
ipcMain.handle('hardwareEncrypt', hardwareEncrypt);
ipcMain.handle('hardwareDecrypt', hardwareDecrypt);

const keyTag = 'net.antelle.keeweb.encryption-key';

let testCipherParams;
let keyChecked = false;

async function hardwareCryptoDeleteKey() {
    const secureEnclave = reqNative('secure-enclave');
    await secureEnclave.deleteKeyPair({ keyTag });
    keyChecked = false;
}

async function hardwareEncrypt(e, value) {
    return await hardwareCrypto(value, true);
}

async function hardwareDecrypt(e, value, touchIdPrompt) {
    return await hardwareCrypto(value, false, touchIdPrompt);
}

async function hardwareCrypto(value, encrypt, touchIdPrompt) {
    if (process.platform !== 'darwin') {
        throw new Error('Not supported');
    }

    // This is a native module, but why is it here and not in native-module-host?
    // It's because native-module-host is started as a fork,
    //  and macOS thinks it doesn't have necessary entitlements,
    //  so any attempt to use Secure Enclave API fails with an error.

    const secureEnclave = reqNative('secure-enclave');

    const data = readXoredValue(value);

    let res;
    if (isDev && process.env.KEEWEB_EMULATE_HARDWARE_ENCRYPTION) {
        const crypto = require('crypto');
        if (!testCipherParams) {
            let key, iv;
            if (process.env.KEEWEB_EMULATE_HARDWARE_ENCRYPTION === 'persistent') {
                key = Buffer.alloc(32, 0);
                iv = Buffer.alloc(16, 0);
            } else {
                key = crypto.randomBytes(32);
                iv = crypto.randomBytes(16);
            }
            testCipherParams = { key, iv };
        }
        const { key, iv } = testCipherParams;
        const algo = 'aes-256-cbc';
        let cipher;
        if (encrypt) {
            cipher = crypto.createCipheriv(algo, key, iv);
        } else {
            cipher = crypto.createDecipheriv(algo, key, iv);
        }
        res = Buffer.concat([cipher.update(data), cipher.final()]);
    } else {
        if (encrypt) {
            await checkKey();
            res = await secureEnclave.encrypt({ keyTag, data });
        } else {
            res = await secureEnclave.decrypt({ keyTag, data, touchIdPrompt });
        }
    }

    data.fill(0);

    return makeXoredValue(res);

    async function checkKey() {
        if (keyChecked) {
            return;
        }
        try {
            await secureEnclave.createKeyPair({ keyTag });
            keyChecked = true;
        } catch (e) {
            if (!e.keyExists) {
                throw e;
            }
        }
    }
}

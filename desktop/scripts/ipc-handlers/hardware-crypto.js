const { readXoredValue, makeXoredValue } = require('../util/byte-utils');
const { reqNative } = require('../util/req-native');

module.exports = {
    hardwareEncrypt,
    hardwareDecrypt
};

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
    // It's because native-module-host is started as a fork, and macOS thinks it doesn't have necessary entitlements,
    //  so any attempts to use secure enclave API fails with an error that there's no necessary entitlement.

    const secureEnclave = reqNative('secure-enclave');
    const keyTag = 'net.antelle.keeweb.encryption-key';

    const data = readXoredValue(value);

    let res;
    if (encrypt) {
        await checkKey();
        res = await secureEnclave.encrypt({ keyTag, data });
    } else {
        res = await secureEnclave.decrypt({ keyTag, data, touchIdPrompt });
    }

    data.fill(0);

    return makeXoredValue(res);

    async function checkKey() {
        if (checkKey.done) {
            return;
        }
        try {
            await secureEnclave.createKeyPair({ keyTag });
            checkKey.done = true;
        } catch (e) {
            if (!e.keyExists) {
                throw e;
            }
        }
    }
}

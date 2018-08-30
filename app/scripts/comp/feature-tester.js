const kdbxweb = require('kdbxweb');
const FeatureDetector = require('../util/feature-detector');

const FeatureTester = {
    test() {
        return Promise.resolve()
            .then(() => this.checkWebAssembly())
            .then(() => this.checkWebCrypto())
            .then(() => this.checkLocalStorage());
    },

    checkWebAssembly() {
        try {
            const module = new global.WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
            return new global.WebAssembly.Instance(module) instanceof global.WebAssembly.Instance;
        } catch (e) {
            throw 'WebAssembly is not supported';
        }
    },

    checkWebCrypto() {
        return Promise.resolve().then(() => {
            const aesCbc = kdbxweb.CryptoEngine.createAesCbc();
            const key = '6b2796fa863a6552986c428528d053b76de7ba8e12f8c0e74edb5ed44da3f601';
            const data = 'e567554429098a38d5f819115edffd39';
            const iv = '4db46dff4add42cb813b98de98e627c4';
            const exp = '46ab4c37d9ec594e5742971f76f7c1620bc29f2e0736b27832d6bcc5c1c39dc1';
            return aesCbc.importKey(kdbxweb.ByteUtils.hexToBytes(key)).then(() => {
                return aesCbc.encrypt(kdbxweb.ByteUtils.hexToBytes(data), kdbxweb.ByteUtils.hexToBytes(iv)).then(res => {
                    if (kdbxweb.ByteUtils.bytesToHex(res) !== exp) {
                        throw 'AES is not working properly';
                    }
                    if (kdbxweb.CryptoEngine.random(1).length !== 1) {
                        throw 'Random is not working';
                    }
                });
            }).catch(e => { throw 'WebCrypto is not supported: ' + e; });
        });
    },

    checkLocalStorage() {
        if (FeatureDetector.isDesktop) {
            return;
        }
        try {
            localStorage.setItem('_test', '1');
            localStorage.removeItem('_test');
        } catch (e) {
            throw 'WebCrypto is not supported';
        }
    }
};

module.exports = FeatureTester;

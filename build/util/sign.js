const fs = require('fs');
const signer = require('pkcs11-smartcard-sign');
const crypto = require('crypto');

const verifyKey = fs.readFileSync('app/resources/public-key.pem');
const signerOptions = JSON.parse(fs.readFileSync('keys/keeweb-sign.json', 'utf8'));

function getPin() {
    if (getPin.pin) {
        return Promise.resolve(getPin.pin);
    }
    return require('keytar')
        .getPassword('keeweb.pin', 'keeweb')
        .then((pass) => {
            if (pass) {
                getPin.pin = pass;
                return pass;
            } else {
                throw 'Cannot find PIN';
            }
        });
}

function getPrivateKey(path) {
    if (!getPrivateKey[path]) {
        getPrivateKey[path] = fs.readFileSync(path);
    }
    return getPrivateKey[path];
}

module.exports = function sign(grunt, data) {
    if (signerOptions.privateKey) {
        return Promise.resolve().then(() => {
            const algo = signerOptions.algo || 'sha256';

            const sign = crypto.createSign(algo);
            sign.update(data);
            const signature = sign.sign(getPrivateKey(signerOptions.privateKey));

            const verify = crypto.createVerify(algo);
            verify.write(data);
            verify.end();

            if (verify.verify(verifyKey, signature)) {
                return signature;
            } else {
                throw 'Validation error';
            }
        });
    }
    return getPin()
        .then((pin) => signer.sign({ data, verifyKey, pin, ...signerOptions }))
        .catch((err) => {
            if (grunt) {
                grunt.warn(`Error signing data: ${err}`);
            }
            throw err;
        });
};

module.exports.getPin = getPin;

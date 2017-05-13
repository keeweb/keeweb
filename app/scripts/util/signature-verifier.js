const Logger = require('./logger');
const publicKey = require('raw-loader!../../resources/public-key.pem');
const kdbxweb = require('kdbxweb');

const SignatureVerifier = {
    logger: new Logger('signature-verifier'),

    verify(data, signature, pk) {
        return new Promise((resolve, reject) => {
            try {
                if (!pk) {
                    pk = this.getPublicKey();
                }
                pk = kdbxweb.ByteUtils.base64ToBytes(pk);
                signature = kdbxweb.ByteUtils.base64ToBytes(signature);
                crypto.subtle.importKey('spki', pk,
                    {name: 'RSASSA-PKCS1-v1_5', hash: {name: 'SHA-256'}},
                    false, ['verify']
                ).then(cryptoKey => {
                    crypto.subtle.verify({name: 'RSASSA-PKCS1-v1_5'}, cryptoKey,
                        kdbxweb.ByteUtils.arrayToBuffer(signature),
                        kdbxweb.ByteUtils.arrayToBuffer(data)
                    ).then(isValid => {
                        resolve(isValid);
                    }).catch(e => {
                        this.logger.error('Verify error', e);
                        reject();
                    });
                }).catch(e => {
                    this.logger.error('ImportKey error', e);
                    reject();
                });
            } catch (e) {
                this.logger.error('Signature verification error', e);
                reject();
            }
        });
    },

    getPublicKey() {
        return publicKey
            .match(/-+BEGIN PUBLIC KEY-+([\s\S]+?)-+END PUBLIC KEY-+/)[1]
            .replace(/\s+/g, '');
    }
};

module.exports = SignatureVerifier;

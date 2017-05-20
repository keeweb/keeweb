const Logger = require('./logger');
const publicKey = require('raw-loader!../../resources/public-key.pem');
const kdbxweb = require('kdbxweb');

const SignatureVerifier = {
    logger: new Logger('signature-verifier'),

    publicKey: null,

    verify(data, signature, pk) {
        return new Promise((resolve, reject) => {
            const algo = {name: 'RSASSA-PKCS1-v1_5', hash: {name: 'SHA-256'}};
            try {
                if (!pk) {
                    pk = this.getPublicKey();
                }
                signature = kdbxweb.ByteUtils.base64ToBytes(signature);
                let subtle = window.crypto.subtle;
                let keyFormat = 'spki';
                if (subtle) {
                    pk = kdbxweb.ByteUtils.base64ToBytes(pk);
                } else {
                    // TODO: remove this shit after Safari 10.2 with spki support goes live
                    subtle = window.crypto.webkitSubtle;
                    keyFormat = 'jwk';
                    pk = this.spkiToJwk(pk);
                }
                subtle.importKey(
                    keyFormat, pk,
                    algo,
                    false, ['verify']
                ).then(cryptoKey => {
                    try {
                        subtle.verify(algo, cryptoKey,
                            kdbxweb.ByteUtils.arrayToBuffer(signature),
                            kdbxweb.ByteUtils.arrayToBuffer(data)
                        ).then(isValid => {
                            resolve(isValid);
                        }).catch(e => {
                            this.logger.error('Verify error', e);
                            reject();
                        });
                    } catch (e) {
                        this.logger.error('Signature verification error', e);
                        reject();
                    }
                }).catch(e => {
                    this.logger.error('ImportKey error', e);
                    reject();
                });
            } catch (e) {
                this.logger.error('Signature key verification error', e);
                reject();
            }
        });
    },

    spkiToJwk(key) {
        // This is terribly wrong but we don't want to handle complete ASN1 format here
        const n = key
            .replace('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA', '')
            .replace('IDAQAB', '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
        return kdbxweb.ByteUtils.stringToBytes(JSON.stringify({
            kty: 'RSA',
            alg: 'RS256',
            e: 'AQAB',
            n: n,
            ext: true
        }));
    },

    getPublicKey() {
        if (!this.publicKey) {
            this.publicKey = publicKey
                .match(/-+BEGIN PUBLIC KEY-+([\s\S]+?)-+END PUBLIC KEY-+/)[1]
                .replace(/\s+/g, '');
        }
        return this.publicKey;
    }
};

module.exports = SignatureVerifier;

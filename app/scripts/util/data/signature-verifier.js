import kdbxweb from 'kdbxweb';
import { Logger } from 'util/logger';
import publicKey from 'public-key.pem';

const SignatureVerifier = {
    logger: new Logger('signature-verifier'),

    publicKey: null,

    verify(data, signature, pk) {
        return new Promise((resolve, reject) => {
            const algo = { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } };
            try {
                if (!pk) {
                    pk = this.getPublicKey();
                }
                if (typeof signature === 'string') {
                    signature = kdbxweb.ByteUtils.base64ToBytes(signature);
                }
                const subtle = window.crypto.subtle;
                const keyFormat = 'spki';
                pk = kdbxweb.ByteUtils.base64ToBytes(pk);
                subtle
                    .importKey(keyFormat, pk, algo, false, ['verify'])
                    .then(cryptoKey => {
                        try {
                            subtle
                                .verify(
                                    algo,
                                    cryptoKey,
                                    kdbxweb.ByteUtils.arrayToBuffer(signature),
                                    kdbxweb.ByteUtils.arrayToBuffer(data)
                                )
                                .then(isValid => {
                                    resolve(isValid);
                                })
                                .catch(e => {
                                    this.logger.error('Verify error', e);
                                    reject(e);
                                });
                        } catch (e) {
                            this.logger.error('Signature verification error', e);
                            reject(e);
                        }
                    })
                    .catch(e => {
                        this.logger.error('ImportKey error', e);
                        reject(e);
                    });
            } catch (e) {
                this.logger.error('Signature key verification error', e);
                reject(e);
            }
        });
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

export { SignatureVerifier };

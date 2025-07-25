import * as kdbxweb from 'kdbxweb';
import { Logger } from 'util/logger';
import publicKeyData from 'public-key.pem';
import publicKeyDataNew from 'public-key-new.pem';

const SignatureVerifier = {
    logger: new Logger('signature-verifier'),

    publicKeys: null,

    verify(data, signature, pk) {
        if (!pk) {
            const pks = this.getPublicKeys();
            return this.verify(data, signature, pks[0]).then((isValid) => {
                if (isValid || !pks[1]) {
                    return isValid;
                }
                return this.verify(data, signature, pks[1]);
            });
        }
        return new Promise((resolve, reject) => {
            const algo = { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } };
            try {
                if (typeof signature === 'string') {
                    signature = kdbxweb.ByteUtils.base64ToBytes(signature);
                }
                const subtle = window.crypto.subtle;
                const keyFormat = 'spki';
                pk = kdbxweb.ByteUtils.base64ToBytes(pk);
                subtle
                    .importKey(keyFormat, pk, algo, false, ['verify'])
                    .then((cryptoKey) => {
                        try {
                            subtle
                                .verify(
                                    algo,
                                    cryptoKey,
                                    kdbxweb.ByteUtils.arrayToBuffer(signature),
                                    kdbxweb.ByteUtils.arrayToBuffer(data)
                                )
                                .then((isValid) => {
                                    resolve(isValid);
                                })
                                .catch((e) => {
                                    this.logger.error('Verify error', e);
                                    reject(e);
                                });
                        } catch (e) {
                            this.logger.error('Signature verification error', e);
                            reject(e);
                        }
                    })
                    .catch((e) => {
                        this.logger.error('ImportKey error', e);
                        reject(e);
                    });
            } catch (e) {
                this.logger.error('Signature key verification error', e);
                reject(e);
            }
        });
    },

    getPublicKeys() {
        if (!this.publicKeys) {
            this.publicKeys = [publicKeyData, publicKeyDataNew].map((pk) =>
                pk.match(/-+BEGIN PUBLIC KEY-+([\s\S]+?)-+END PUBLIC KEY-+/)[1].replace(/\s+/g, '')
            );
        }
        return this.publicKeys;
    }
};

export { SignatureVerifier };

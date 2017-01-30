'use strict';

const kdbxweb = require('kdbxweb');

const KdbxwebInit = {
    init() {
        kdbxweb.CryptoEngine.argon2 = this.argon2;
    },

    argon2(password, salt, memory, iterations, length, parallelism, type, version) {
        const Module = require('argon2');
        let passwordLen = password.byteLength;
        password = Module.allocate(new Uint8Array(password), 'i8', Module.ALLOC_NORMAL);
        let saltLen = salt.byteLength;
        salt = Module.allocate(new Uint8Array(salt), 'i8', Module.ALLOC_NORMAL);
        let hash = Module.allocate(new Array(length), 'i8', Module.ALLOC_NORMAL);
        let encodedLen = 512;
        let encoded = Module.allocate(new Array(encodedLen), 'i8', Module.ALLOC_NORMAL);
        // jshint camelcase:false
        try {
            let res = Module._argon2_hash(iterations, memory, parallelism,
                password, passwordLen, salt, saltLen,
                hash, length, encoded, encodedLen, type, version);
            if (res) {
                return Promise.reject('Argon2 error ' + res);
            }
            let hashArr = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                hashArr[i] = Module.HEAP8[hash + i];
            }
            Module._free(password);
            Module._free(salt);
            Module._free(hash);
            Module._free(encoded);
            return Promise.resolve(hashArr);
        } catch (e) {
            return Promise.reject(e);
        }
    }
};

module.exports = KdbxwebInit;

'use strict';

const kdbxweb = require('kdbxweb');
const Logger = require('../util/logger');

const logger = new Logger('argon2');

const KdbxwebInit = {
    init() {
        kdbxweb.CryptoEngine.argon2 = (...args) => this.argon2(...args);
    },

    argon2(password, salt, memory, iterations, length, parallelism, type, version) {
        return this.loadRuntime().then((Module) => {
            const passwordLen = password.byteLength;
            password = Module.allocate(new Uint8Array(password), 'i8', Module.ALLOC_NORMAL);
            const saltLen = salt.byteLength;
            salt = Module.allocate(new Uint8Array(salt), 'i8', Module.ALLOC_NORMAL);
            const hash = Module.allocate(new Array(length), 'i8', Module.ALLOC_NORMAL);
            const encodedLen = 512;
            const encoded = Module.allocate(new Array(encodedLen), 'i8', Module.ALLOC_NORMAL);

            const ts = logger.ts();
            const res = Module._argon2_hash(iterations, memory, parallelism,
                password, passwordLen, salt, saltLen,
                hash, length, encoded, encodedLen, type, version);
            if (res) {
                throw new Error('Argon2 error ' + res);
            }
            logger.debug('Hash computed', logger.ts(ts));
            const hashArr = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                hashArr[i] = Module.HEAP8[hash + i];
            }
            Module._free(password);
            Module._free(salt);
            Module._free(hash);
            Module._free(encoded);
            return hashArr;
        });
    },

    loadRuntime: function() {
        if (this.runtimeModule) {
            return Promise.resolve(this.runtimeModule);
        }
        if (!global.WebAssembly) {
            return this.loadAsmJsFallbackRuntime();
        }
        return new Promise((resolve, reject) => {
            const loadTimeout = setTimeout(() => reject('timeout'), 1000);
            try {
                const ts = logger.ts();
                const argon2LoaderCode = require('argon2');
                const wasmBinaryBase64 = require('argon2-wasm');
                const wasmBinary = kdbxweb.ByteUtils.base64ToBytes(wasmBinaryBase64).buffer;
                const Module = global.Module = {
                    print: (...args) => logger.debug(...args),
                    printErr: (...args) => logger.debug(...args),
                    wasmBinary: wasmBinary,
                    wasmJSMethod: 'native-wasm',
                    postRun: () => {
                        logger.debug('WebAssembly runtime loaded', logger.ts(ts));
                        clearTimeout(loadTimeout);
                        this.runtimeModule = Module;
                        resolve(this.runtimeModule);
                    }
                };
                global.eval(argon2LoaderCode); // eslint-disable-line
            } catch (err) {
                reject(err);
            }
        }).catch(err => {
            logger.warn('WebAssembly error', err);
            return this.loadAsmJsFallbackRuntime();
        });
    },

    loadAsmJsFallbackRuntime: function() {
        logger.debug('Loading asm.js fallback runtime');
        return new Promise(resolve => {
            const ts = logger.ts();
            global.Module = undefined;
            const argon2Code = require('argon2-asm');
            global.eval(argon2Code); // eslint-disable-line
            this.runtimeModule = global.Module;
            logger.debug('Fallback runtime loaded', logger.ts(ts));
            resolve(this.runtimeModule);
        });
    }
};

module.exports = KdbxwebInit;

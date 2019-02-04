const kdbxweb = require('kdbxweb');
const Logger = require('../util/logger');

const logger = new Logger('argon2');

const KdbxwebInit = {
    init() {
        kdbxweb.CryptoEngine.argon2 = (...args) => this.argon2(...args);
    },

    argon2(password, salt, memory, iterations, length, parallelism, type, version) {
        const args = { password, salt, memory, iterations, length, parallelism, type, version };
        return this.loadRuntime(memory).then(runtime => {
            const ts = logger.ts();
            return runtime.hash(args).then(hash => {
                logger.debug('Hash computed', logger.ts(ts));
                return hash;
            });
        });
    },

    loadRuntime(requiredMemory) {
        if (this.runtimeModule) {
            return Promise.resolve(this.runtimeModule);
        }
        if (!global.WebAssembly) {
            return Promise.reject('WebAssembly is not supported');
        }
        return new Promise((resolve, reject) => {
            const loadTimeout = setTimeout(() => reject('timeout'), 5000);
            try {
                const ts = logger.ts();
                const argon2LoaderCode = require('argon2');
                const wasmBinaryBase64 = require('argon2-wasm');

                const KB = 1024 * 1024;
                const MB = 1024 * KB;
                const GB = 1024 * MB;
                const WASM_PAGE_SIZE = 64 * 1024;
                const totalMemory = (2 * GB - 64 * KB) / 1024 / WASM_PAGE_SIZE;
                const initialMemory = Math.min(Math.max(Math.ceil(requiredMemory * 1024 / WASM_PAGE_SIZE), 256) + 256, totalMemory);

                const memoryDecl = `var wasmMemory=new WebAssembly.Memory({initial:${initialMemory},maximum:${totalMemory}});`;
                const moduleDecl = 'var Module={' +
                    'wasmJSMethod: "native-wasm",' +
                    'wasmBinary: Uint8Array.from(atob("' + wasmBinaryBase64 + '"), c => c.charCodeAt(0)),' +
                    'print(...args) { postMessage({op:"log",args}) },' +
                    'printErr(...args) { postMessage({op:"log",args}) },' +
                    'postRun:' + this.workerPostRun.toString() + ',' +
                    'calcHash:' + this.calcHash.toString() + ',' +
                    'wasmMemory:wasmMemory,' +
                    'buffer:wasmMemory.buffer,' +
                    'TOTAL_MEMORY:' + initialMemory * WASM_PAGE_SIZE +
                    '}';
                const script = argon2LoaderCode.replace('var Module', memoryDecl + moduleDecl);
                const blob = new Blob([script], {type: 'application/javascript'});
                const objectUrl = URL.createObjectURL(blob);
                const worker = new Worker(objectUrl);
                const onMessage = e => {
                    switch (e.data.op) {
                        case 'log':
                            logger.debug(...e.data.args);
                            break;
                        case 'postRun':
                            logger.debug('WebAssembly runtime loaded', logger.ts(ts));
                            URL.revokeObjectURL(objectUrl);
                            clearTimeout(loadTimeout);
                            worker.removeEventListener('message', onMessage);
                            this.runtimeModule = {
                                hash(args) {
                                    return new Promise((resolve, reject) => {
                                        worker.postMessage(args);
                                        const onHashMessage = e => {
                                            worker.removeEventListener('message', onHashMessage);
                                            worker.terminate();
                                            KdbxwebInit.runtimeModule = null;
                                            if (!e.data || e.data.error || !e.data.hash) {
                                                const ex = e.data && e.data.error || 'unexpected error';
                                                logger.error('Worker error', ex);
                                                reject(ex);
                                            }
                                            resolve(e.data.hash);
                                        };
                                        worker.addEventListener('message', onHashMessage);
                                    });
                                }
                            };
                            resolve(this.runtimeModule);
                            break;
                        default:
                            logger.error('Unknown message', e.data);
                            URL.revokeObjectURL(objectUrl);
                            reject('Load error');
                    }
                };
                worker.addEventListener('message', onMessage);
            } catch (err) {
                reject(err);
            }
        }).catch(err => {
            logger.warn('WebAssembly error', err);
            return this.loadAsmJsFallbackRuntime();
        });
    },

    workerPostRun() {
        self.postMessage({ op: 'postRun' });
        self.onmessage = e => {
            try {
                const hash = self.Module.calcHash(self.Module, e.data);
                self.postMessage({ hash });
            } catch (e) {
                self.postMessage({ error: e.toString() });
            }
        };
    },

    calcHash(Module, args) {
        let { password, salt } = args;
        const { memory, iterations, length, parallelism, type, version } = args;
        const passwordLen = password.byteLength;
        password = Module.allocate(new Uint8Array(password), 'i8', Module.ALLOC_NORMAL);
        const saltLen = salt.byteLength;
        salt = Module.allocate(new Uint8Array(salt), 'i8', Module.ALLOC_NORMAL);
        const hash = Module.allocate(new Array(length), 'i8', Module.ALLOC_NORMAL);
        const encodedLen = 512;
        const encoded = Module.allocate(new Array(encodedLen), 'i8', Module.ALLOC_NORMAL);

        const res = Module._argon2_hash(iterations, memory, parallelism,
            password, passwordLen, salt, saltLen,
            hash, length, encoded, encodedLen, type, version);
        if (res) {
            throw new Error('Argon2 error ' + res);
        }
        const hashArr = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            hashArr[i] = Module.HEAP8[hash + i];
        }
        Module._free(password);
        Module._free(salt);
        Module._free(hash);
        Module._free(encoded);
        return hashArr;
    }
};

module.exports = KdbxwebInit;

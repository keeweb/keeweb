import { Features } from 'util/features';

const FeatureTester = {
    test() {
        return Promise.resolve()
            .then(() => this.checkWebAssembly())
            .then(() => this.checkLocalStorage())
            .then(() => this.checkWebCrypto());
    },

    checkWebAssembly() {
        try {
            const module = new global.WebAssembly.Module(
                Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
            );
            return new global.WebAssembly.Instance(module) instanceof global.WebAssembly.Instance;
        } catch (e) {
            throw 'WebAssembly is not supported';
        }
    },

    checkLocalStorage() {
        if (Features.isDesktop) {
            return;
        }
        try {
            localStorage.setItem('_test', '1');
            localStorage.removeItem('_test');
        } catch (e) {
            throw 'LocalStorage is not supported';
        }
    },

    checkWebCrypto() {
        if (!global.crypto.subtle) {
            throw 'WebCrypto is not supported';
        }
    }
};

export { FeatureTester };

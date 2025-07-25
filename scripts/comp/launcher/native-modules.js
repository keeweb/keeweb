import * as kdbxweb from 'kdbxweb';
import { Events } from 'framework/events';
import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { Timeouts } from 'const/timeouts';

let NativeModules;

if (Launcher) {
    const logger = new Logger('native-module-connector');

    let hostRunning = false;
    let hostStartPromise;
    let callId = 0;
    let promises = {};
    let ykChalRespCallbacks = {};

    const { ipcRenderer } = Launcher.electron();
    ipcRenderer.on('nativeModuleCallback', (e, msg) => NativeModules.hostCallback(msg));
    ipcRenderer.on('nativeModuleHostError', (e, err) => NativeModules.hostError(err));
    ipcRenderer.on('nativeModuleHostExit', (e, { code, sig }) => NativeModules.hostExit(code, sig));
    ipcRenderer.on('nativeModuleHostDisconnect', () => NativeModules.hostDisconnect());
    ipcRenderer.on('log', (e, ...args) => NativeModules.log(...args));

    const handlers = {
        yubikeys(numYubiKeys) {
            Events.emit('native-modules-yubikeys', { numYubiKeys });
        },

        log(...args) {
            logger.info('Message from host', ...args);
        },

        result({ callId, result, error }) {
            const promise = promises[callId];
            if (promise) {
                delete promises[callId];
                if (error) {
                    logger.error('Received an error', promise.cmd, error);
                    promise.reject(error);
                } else {
                    promise.resolve(result);
                }
            }
        },

        yubiKeyChallengeResponseResult({ callbackId, error, result }) {
            const callback = ykChalRespCallbacks[callbackId];
            if (callback) {
                const willBeCalledAgain = error && error.touchRequested;
                if (!willBeCalledAgain) {
                    delete ykChalRespCallbacks[callbackId];
                }
                callback(error, result);
            }
        }
    };

    NativeModules = {
        startHost() {
            if (hostRunning) {
                return Promise.resolve();
            }
            if (hostStartPromise) {
                return hostStartPromise;
            }

            logger.debug('Starting native module host');

            hostStartPromise = this.callNoWait('start').then(() => {
                hostStartPromise = undefined;
                hostRunning = true;

                if (this.usbListenerRunning) {
                    return this.call('startUsbListener');
                }
            });

            return hostStartPromise;
        },

        hostError(e) {
            logger.error('Host error', e);
        },

        hostDisconnect() {
            logger.error('Host disconnected');
        },

        hostExit(code, sig) {
            logger.error(`Host exited with code ${code} and signal ${sig}`);

            hostRunning = false;

            const err = new Error('Native module host crashed');

            for (const promise of Object.values(promises)) {
                promise.reject(err);
            }
            promises = {};

            for (const callback of Object.values(ykChalRespCallbacks)) {
                callback(err);
            }
            ykChalRespCallbacks = {};

            if (code !== 0) {
                this.autoRestartHost();
            }
        },

        hostCallback(message) {
            const { cmd, args } = message;
            // logger.debug('Callback', cmd, args);
            if (handlers[cmd]) {
                handlers[cmd](...args);
            } else {
                logger.error('No callback', cmd);
            }
        },

        log(name, level, ...args) {
            if (!name) {
                return;
            }
            const logger = new Logger(name);
            logger[level](...args);
        },

        autoRestartHost() {
            setTimeout(() => {
                try {
                    this.startHost();
                } catch (e) {
                    logger.error('Native module host failed to auto-restart', e);
                }
            }, Timeouts.NativeModuleHostRestartTime);
        },

        call(cmd, ...args) {
            return this.startHost().then(() => this.callNoWait(cmd, ...args));
        },

        callNoWait(cmd, ...args) {
            return new Promise((resolve, reject) => {
                callId++;
                if (callId === Number.MAX_SAFE_INTEGER) {
                    callId = 1;
                }
                // logger.debug('Call', cmd, args, callId);
                promises[callId] = { cmd, resolve, reject };

                ipcRenderer.send('nativeModuleCall', { cmd, args, callId });
            });
        },

        startUsbListener() {
            this.call('startUsbListener');
            this.usbListenerRunning = true;
        },

        stopUsbListener() {
            this.usbListenerRunning = false;
            if (hostRunning) {
                this.call('stopUsbListener');
            }
        },

        getYubiKeys(config) {
            return this.call('getYubiKeys', config);
        },

        yubiKeyChallengeResponse(yubiKey, challenge, slot, callback) {
            ykChalRespCallbacks[callId] = callback;
            return this.call('yubiKeyChallengeResponse', yubiKey, challenge, slot, callId);
        },

        yubiKeyCancelChallengeResponse() {
            if (hostRunning) {
                this.call('yubiKeyCancelChallengeResponse');
            }
        },

        argon2(password, salt, options) {
            return this.call('argon2', password, salt, options);
        },

        hardwareCryptoDeleteKey: async () => {
            await ipcRenderer.invoke('hardwareCryptoDeleteKey');
        },

        hardwareEncrypt: async (value) => {
            const { data, salt } = await ipcRenderer.invoke('hardwareEncrypt', value.dataAndSalt());
            return new kdbxweb.ProtectedValue(data, salt);
        },

        hardwareDecrypt: async (value, touchIdPrompt) => {
            const { data, salt } = await ipcRenderer.invoke(
                'hardwareDecrypt',
                value.dataAndSalt(),
                touchIdPrompt
            );
            return new kdbxweb.ProtectedValue(data, salt);
        },

        kbdGetActiveWindow(options) {
            return this.call('kbdGetActiveWindow', options);
        },

        kbdGetActivePid() {
            return this.call('kbdGetActivePid');
        },

        kbdShowWindow(win) {
            return this.call('kbdShowWindow', win);
        },

        kbdText(str) {
            return this.call('kbdText', str);
        },

        kbdTextAsKeys(str, mods) {
            return this.call('kbdTextAsKeys', str, mods);
        },

        kbdKeyPress(code, modifiers) {
            return this.call('kbdKeyPress', code, modifiers);
        },

        kbdShortcut(code, modifiers) {
            return this.call('kbdShortcut', code, modifiers);
        },

        kbdKeyMoveWithModifier(down, modifiers) {
            return this.call('kbdKeyMoveWithModifier', down, modifiers);
        },

        kbdKeyPressWithCharacter(character, code, modifiers) {
            return this.call('kbdKeyPressWithCharacter', character, code, modifiers);
        },

        kbdEnsureModifierNotPressed() {
            return this.call('kbdEnsureModifierNotPressed');
        }
    };

    global.NativeModules = NativeModules;
}

export { NativeModules };

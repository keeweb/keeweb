import kdbxweb from 'kdbxweb';
import { Events } from 'framework/events';
import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { Timeouts } from 'const/timeouts';

let NativeModules;

if (Launcher) {
    const logger = new Logger('native-module-connector');

    let host;
    let callId = 0;
    let promises = {};
    let ykChalRespCallbacks = {};

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
            if (host) {
                return;
            }

            logger.debug('Starting native module host');

            const path = Launcher.req('path');
            const appContentRoot = Launcher.remoteApp().getAppContentRoot();
            const mainModulePath = path.join(appContentRoot, 'native-module-host.js');

            const { fork } = Launcher.req('child_process');

            host = fork(mainModulePath);

            host.on('message', (message) => this.hostCallback(message));

            host.on('error', (e) => this.hostError(e));
            host.on('exit', (code, sig) => this.hostExit(code, sig));

            if (this.usbListenerRunning) {
                this.call('start-usb');
            }
        },

        hostError(e) {
            logger.error('Host error', e);
        },

        hostExit(code, sig) {
            logger.error(`Host exited with code ${code} and signal ${sig}`);
            host = null;

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
            return new Promise((resolve, reject) => {
                if (!host) {
                    try {
                        this.startHost();
                    } catch (e) {
                        return reject(e);
                    }
                }

                callId++;
                if (callId === Number.MAX_SAFE_INTEGER) {
                    callId = 1;
                }
                // logger.debug('Call', cmd, args, callId);
                promises[callId] = { cmd, resolve, reject };
                host.send({ cmd, args, callId });
            });
        },

        startUsbListener() {
            this.call('startUsbListener');
            this.usbListenerRunning = true;
        },

        stopUsbListener() {
            this.usbListenerRunning = false;
            if (host) {
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
            if (host) {
                this.call('yubiKeyCancelChallengeResponse');
            }
        },

        argon2(password, salt, options) {
            return this.call('argon2', password, salt, options);
        },

        hardwareEncrypt: async (value) => {
            const { ipcRenderer } = Launcher.electron();
            const { data, salt } = await ipcRenderer.invoke('hardwareEncrypt', value.dataAndSalt());
            return new kdbxweb.ProtectedValue(data, salt);
        },

        hardwareDecrypt: async (value, touchIdPrompt) => {
            const { ipcRenderer } = Launcher.electron();
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

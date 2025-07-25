import { Features } from 'util/features';
import { NativeModules } from 'comp/launcher/native-modules';
import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { Timeouts } from 'const/timeouts';

const logger = new Logger('auto-type-emitter');

const KeyMap = {
    tab: 'Tab',
    enter: 'Return',
    space: 'Space',
    up: 'UpArrow',
    down: 'DownArrow',
    left: 'LeftArrow',
    right: 'RightArrow',
    home: 'Home',
    end: 'End',
    pgup: 'PageUp',
    pgdn: 'PageDown',
    ins: 'Insert',
    del: 'ForwardDelete',
    bs: 'BackwardDelete',
    esc: 'Escape',
    win: 'Meta',
    rwin: 'RightMeta',
    f1: 'F1',
    f2: 'F2',
    f3: 'F3',
    f4: 'F4',
    f5: 'F5',
    f6: 'F6',
    f7: 'F7',
    f8: 'F8',
    f9: 'F9',
    f10: 'F10',
    f11: 'F11',
    f12: 'F12',
    f13: 'F13',
    f14: 'F14',
    f15: 'F15',
    f16: 'F16',
    add: 'KeypadPlus',
    subtract: 'KeypadMinus',
    multiply: 'KeypadMultiply',
    divide: 'KeypadDivide',
    n0: 'D0',
    n1: 'D1',
    n2: 'D2',
    n3: 'D3',
    n4: 'D4',
    n5: 'D5',
    n6: 'D6',
    n7: 'D7',
    n8: 'D8',
    n9: 'D9'
};

const ModMap = {
    '^': Features.isMac ? 'Command' : 'Ctrl',
    '+': 'Shift',
    '%': 'Alt',
    '^^': 'Ctrl'
};

class AutoTypeEmitter {
    constructor(callback) {
        this.callback = callback;
        this.mod = {};
    }

    begin() {
        this.withCallback(NativeModules.kbdEnsureModifierNotPressed());
    }

    setMod(mod, enabled) {
        const nativeMod = ModMap[mod];
        if (!nativeMod) {
            return this.callback(`Bad modifier: ${mod}`);
        }
        NativeModules.kbdKeyMoveWithModifier(!!enabled, [nativeMod]).catch((e) => {
            logger.error('Error moving modifier', mod, enabled ? 'down' : 'up', e);
        });
        if (enabled) {
            this.mod[nativeMod] = true;
        } else {
            delete this.mod[nativeMod];
        }
    }

    text(str) {
        if (!str) {
            return this.withCallback(Promise.resolve());
        }
        const mods = Object.keys(this.mod);
        if (mods.length) {
            this.withCallback(NativeModules.kbdTextAsKeys(str, mods));
        } else {
            this.withCallback(NativeModules.kbdText(str));
        }
    }

    key(key) {
        const mods = Object.keys(this.mod);
        if (typeof key === 'number') {
            this.withCallback(NativeModules.kbdKeyPressWithCharacter(0, key, mods));
        } else {
            if (!KeyMap[key]) {
                return this.callback('Bad key: ' + key);
            }
            const code = KeyMap[key];
            this.withCallback(NativeModules.kbdKeyPress(code, mods));
        }
    }

    copyPaste(text) {
        setTimeout(() => {
            Launcher.setClipboardText(text);
            setTimeout(() => {
                this.withCallback(NativeModules.kbdShortcut('V'));
            }, Timeouts.AutoTypeCopyPaste);
        }, Timeouts.AutoTypeCopyPaste);
    }

    wait(time) {
        setTimeout(() => this.withCallback(Promise.resolve()), time);
    }

    waitComplete() {
        this.withCallback(Promise.resolve());
    }

    setDelay() {
        this.callback('Not implemented');
    }

    withCallback(promise) {
        promise
            .then(() => {
                try {
                    this.callback();
                } catch (err) {
                    logger.error('Callback error', err);
                }
            })
            .catch((err) => {
                const keyPressFailed = err.message === 'Key press failed';
                if (keyPressFailed) {
                    err.keyPressFailed = true;
                }
                try {
                    this.callback(err);
                } catch (err) {
                    logger.error('Callback error', err);
                }
            });
    }
}

export { AutoTypeEmitter };

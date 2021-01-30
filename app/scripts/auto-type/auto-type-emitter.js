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

    setMod(mod, enabled) {
        // TODO: press the modifier
        if (enabled) {
            this.mod[ModMap[mod]] = true;
        } else {
            delete this.mod[ModMap[mod]];
        }
    }

    text(str) {
        this.withCallback(NativeModules.kbdText(str));
    }

    key(key) {
        const mods = Object.keys(this.mod);
        if (typeof key === 'number') {
            this.withCallback(
                NativeModules.kbdKeyMoveWithCharacter(true, 0, key, mods).then(() =>
                    NativeModules.kbdKeyMoveWithCharacter(false, 0, key, mods)
                )
            );
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

    setDelay(delay) {
        // TODO: set delay to {delay} milliseconds between keystrokes
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
                try {
                    this.callback(err);
                } catch (err) {
                    logger.error('Callback error', err);
                }
            });
    }
}

export { AutoTypeEmitter };

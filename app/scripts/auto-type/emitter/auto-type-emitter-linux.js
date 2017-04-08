const Launcher = require('../../comp/launcher');
const Locale = require('../../util/locale');

// https://cgit.freedesktop.org/xorg/proto/x11proto/plain/keysymdef.h
const KeyMap = {
    tab: 'Tab', enter: 'KP_Enter', space: 'KP_Space',
    up: 'Up', down: 'Down', left: 'Left', right: 'Right', home: 'Home', end: 'End', pgup: 'Page_Up', pgdn: 'Page_Down',
    ins: 'Insert', del: 'Delete', bs: 'BackSpace', esc: 'Escape',
    win: 'Meta_L', rwin: 'Meta_R',
    f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5', f6: 'F6', f7: 'F7', f8: 'F8', f9: 'F9',
    f10: 'F10', f11: 'F11', f12: 'F12', f13: 'F13', f14: 'F14', f15: 'F15', f16: 'F16',
    add: 'KP_Add', subtract: 'KP_Subtract', multiply: 'KP_Multiply', divide: 'KP_Divide',
    n0: 'KP_0', n1: 'KP_1', n2: 'KP_2', n3: 'KP_3', n4: 'KP_4',
    n5: 'KP_5', n6: 'KP_6', n7: 'KP_7', n8: 'KP_8', n9: 'KP_9'
};

const ModMap = {
    '^': 'ctrl',
    '+': 'shift',
    '%': 'alt',
    '^^': 'ctrl'
};

const AutoTypeEmitter = function(callback) {
    this.callback = callback;
    this.mod = {};
    this.pendingScript = [];
};

AutoTypeEmitter.prototype.setMod = function(mod, enabled) {
    if (enabled) {
        this.mod[ModMap[mod]] = true;
    } else {
        delete this.mod[ModMap[mod]];
    }
};

AutoTypeEmitter.prototype.text = function(text) {
    this.pendingScript.push('keyup ctrl alt shift t');
    Object.keys(this.mod).forEach(mod => {
        this.pendingScript.push('keydown ' + ModMap[mod]);
    });
    text.split('').map(char => {
        this.pendingScript.push('key U' + char.charCodeAt(0).toString(16));
    });
    Object.keys(this.mod).forEach(mod => {
        this.pendingScript.push('keyup ' + ModMap[mod]);
    });
    this.waitComplete();
};

AutoTypeEmitter.prototype.key = function(key) {
    if (typeof key !== 'number') {
        if (!KeyMap[key]) {
            return this.callback('Bad key: ' + key);
        }
        key = KeyMap[key].toString(16);
    }
    this.pendingScript.push('key --clearmodifiers ' + this.modString() + key);
    this.callback();
};

AutoTypeEmitter.prototype.copyPaste = function(text) {
    this.pendingScript.push('sleep 0.5');
    Launcher.setClipboardText(text);
    this.pendingScript.push('key --clearmodifiers shift+Insert');
    this.pendingScript.push('sleep 0.5');
    this.waitComplete();
};

AutoTypeEmitter.prototype.wait = function(time) {
    this.pendingScript.push('sleep ' + (time / 1000));
    this.callback();
};

AutoTypeEmitter.prototype.waitComplete = function(callback) {
    if (this.pendingScript.length) {
        const script = this.pendingScript.join(' ');
        this.pendingScript.length = 0;
        this.runScript(script, callback);
    } else {
        this.callback();
    }
};

AutoTypeEmitter.prototype.modString = function() {
    let mod = '';
    Object.keys(this.mod).forEach(key => {
        mod += key + '+';
    });
    return mod;
};

AutoTypeEmitter.prototype.runScript = function(script, callback) {
    Launcher.spawn({
        cmd: 'xdotool',
        args: ['-'],
        data: script,
        complete: (err, stdout, code) => {
            if (err && err.code === 'ENOENT') {
                err = Locale.autoTypeErrorNotInstalled.replace('{}', 'xdotool');
            }
            const cb = callback || this.callback;
            cb(err, stdout, code);
        }
    });
};

module.exports = AutoTypeEmitter;

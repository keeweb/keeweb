'use strict';

var Launcher = require('../../launcher');

// https://cgit.freedesktop.org/xorg/proto/x11proto/plain/keysymdef.h
var KeyMap = {
    tab: '0xff89', enter: '0xff8d', space: '0xff80',
    up: '0xff97', down: '0xff99', left: '0xff96', right: '0xff98', home: '0xff95', end: '0xff9c', pgup: '0xff9a', pgdn: '0xff9b',
    ins: '0xff9e', del: '0xffff', bs: '0xff08', esc: '0xff1b',
    win: '0xffe7', rwin: '0xffe8',
    f1: '0xffbe', f2: '0xffbf', f3: '0xffc0', f4: '0xffc1', f5: '0xffc2', f6: '0xffc3', f7: '0xffc4', f8: '0xffc5', f9: '0xffc6',
    f10: '0xffc7', f11: '0xffc8', f12: '0xffc9', f13: '0xffca', f14: '0xffcb', f15: '0xffcc', f16: '0xffcd',
    add: '0xffab', subtract: '0xffad', multiply: '0xffaa', divide: '0xffaf',
    n0: '0xffb0', n1: '0xffb1', n2: '0xffb2', n3: '0xffb3', n4: '0xffb4',
    n5: '0xffb5', n6: '0xffb6', n7: '0xffb7', n8: '0xffb8', n9: '0xffb9'
};

var ModMap = {
    '^': 'ctrl',
    '+': 'shift',
    '%': 'alt',
    '^^': 'ctrl'
};

var AutoTypeEmitter = function(callback) {
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
    this.pendingScript.push('text ' + this.modString() + text);
    this.callback();
};

AutoTypeEmitter.prototype.key = function(key) {
    if (typeof key !== 'number') {
        if (!KeyMap[key]) {
            return this.callback('Bad key: ' + key);
        }
        key = KeyMap[key].toString(16);
    }
    this.pendingScript.push('key ' + this.modString() + key);
    this.callback();
};

AutoTypeEmitter.prototype.copyPaste = function(text) {
    Launcher.setClipboardText(text);
    this.waitComplete();
};

AutoTypeEmitter.prototype.waitComplete = function() {
    if (this.pendingScript.length) {
        var script = this.pendingScript.join(' ');
        this.pendingScript.length = 0;
        this.runScript(script);
    } else {
        this.callback();
    }
};

AutoTypeEmitter.prototype.modString = function() {
    var mod = '';
    Object.keys(this.mod).forEach(function (key) {
        mod += key + '+';
    });
    return mod;
};

AutoTypeEmitter.prototype.runScript = function(script) {
    Launcher.spawn({
        cmd: 'xdotool',
        data: script,
        complete: this.callback
    });
};

module.exports = AutoTypeEmitter;

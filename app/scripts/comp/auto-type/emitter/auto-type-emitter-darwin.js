'use strict';

var Launcher = require('../../launcher');

var KeyMap = {
    tab: 48, enter: 36, space: 49,
    up: 126, down: 125, left: 123, right: 124, home: 115, end: 119, pgup: 116, pgdn: 121,
    ins: 114, del: 117, bs: 51, esc: 53,
    win: 55, rwin: 55,
    f1: 122, f2: 120, f3: 99, f4: 118, f5: 96, f6: 97, f7: 98, f8: 100, f9: 101,
    f10: 109, f11: 103, f12: 111, f13: 105, f14: 107, f15: 113, f16: 106,
    add: 69, subtract: 78, multiply: 67, divide: 75,
    n0: 82, n1: 83, n2: 84, n3: 85, n4: 86,
    n5: 87, n6: 88, n7: 89, n8: 91, n9: 92
};

var ModMap = {
    '^': 'command',
    '+': 'shift',
    '%': 'option',
    '^^': 'control'
};

var AutoTypeEmitter = function(callback) {
    this.callback = callback;
    this.mod = {};
    this.pendingScript = [];
};

AutoTypeEmitter.prototype.setMod = function(mod, enabled) {
    if (enabled) {
        this.mod[mod] = true;
    } else {
        delete this.mod[mod];
    }
};

AutoTypeEmitter.prototype.text = function(text) {
    text = text.replace(/"/g, '\\"');
    this.pendingScript.push('keystroke "' + text + '"'+ this.modString());
    this.callback();
};

AutoTypeEmitter.prototype.key = function(key) {
    if (typeof key !== 'number') {
        if (!KeyMap[key]) {
            return this.callback('Bad key: ' + key);
        }
        key = KeyMap[key];
    }
    this.pendingScript.push('key code ' + key + this.modString());
    this.callback();
};

AutoTypeEmitter.prototype.copyPaste = function(text) {
    this.pendingScript.push('delay 0.5');
    this.pendingScript.push('set the clipboard to "' + text.replace(/"/g, '\\"') + '"');
    this.pendingScript.push('delay 0.5');
    this.pendingScript.push('keystroke "v" using command down');
    this.pendingScript.push('delay 0.5');
    this.callback();
};

AutoTypeEmitter.prototype.wait = function(time) {
    this.pendingScript.push('delay ' + (time / 1000));
    this.callback();
};

AutoTypeEmitter.prototype.waitComplete = function() {
    if (this.pendingScript.length) {
        var script = this.pendingScript.join('\n');
        this.pendingScript.length = 0;
        this.runScript(script);
    } else {
        this.callback();
    }
};

AutoTypeEmitter.prototype.setDelay = function(delay) {
    this.delay = delay || 0;
    this.callback('Not implemented');
};

AutoTypeEmitter.prototype.modString = function() {
    var keys = Object.keys(this.mod);
    if (!keys.length) {
        return '';
    }
    return ' using {' + keys.map(AutoTypeEmitter.prototype.mapMod).join(', ') + '}';
};

AutoTypeEmitter.prototype.mapMod = function(mod) {
    return ModMap[mod] + ' down';
};

AutoTypeEmitter.prototype.runScript = function(script) {
    script = 'tell application "System Events" \n' + script + '\nend tell';
    Launcher.spawn({
        cmd: 'osascript',
        data: script,
        complete: this.callback
    });
};

module.exports = AutoTypeEmitter;

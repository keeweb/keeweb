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

var AutoTypeEmitterImpl = function() {
    this.mod = {};
    this.pendingScript = [];
};

AutoTypeEmitterImpl.prototype.setMod = function(mod, enabled) {
    if (enabled) {
        this.mod[mod] = true;
    } else {
        delete this.mod[mod];
    }
};

AutoTypeEmitterImpl.prototype.text = function(text, callback) {
    if (!text) {
        return callback();
    }
    text = text.replace(/"/g, '\\"');
    this.pendingScript.push('keystroke "' + text + '"'+ this.modString());
    callback();
};

AutoTypeEmitterImpl.prototype.key = function(key, callback) {
    if (typeof key !== 'number') {
        if (!KeyMap[key]) {
            return callback('Bad key: ' + key);
        }
        key = KeyMap[key];
    }
    this.pendingScript.push('key code ' + key + this.modString());
    callback();
};

AutoTypeEmitterImpl.prototype.copyPaste = function(text, callback) {
    this.pendingScript.push('delay 0.5');
    this.pendingScript.push('set the clipboard to "' + text.replace(/"/g, '\\"') + '"');
    this.pendingScript.push('delay 0.5');
    this.pendingScript.push('keystroke "v" using command down');
    this.pendingScript.push('delay 0.5');
    callback();
};

AutoTypeEmitterImpl.prototype.waitComplete = function(callback) {
    if (this.pendingScript.length) {
        var script = this.pendingScript.join('\n');
        this.pendingScript.length = 0;
        this.runScript(script, callback);
    } else {
        callback();
    }
};

AutoTypeEmitterImpl.prototype.modString = function() {
    var keys = Object.keys(this.mod);
    if (!keys.length) {
        return '';
    }
    return ' using {' + keys.map(AutoTypeEmitterImpl.prototype.mapMod).join(', ') + '}';
};

AutoTypeEmitterImpl.prototype.mapMod = function(mod) {
    return ModMap[mod] + ' down';
};

AutoTypeEmitterImpl.prototype.runScript = function(script, callback) {
    script = 'tell application "System Events" \n' + script + '\nend tell';
    Launcher.spawn({
        cmd: 'osascript',
        data: script,
        complete: callback
    });
};

module.exports = AutoTypeEmitterImpl;

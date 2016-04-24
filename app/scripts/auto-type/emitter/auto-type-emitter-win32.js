'use strict';

var Launcher = require('../../comp/launcher'),
    AutoTypeHelper = require('../helper/auto-type-helper-win32');

// https://msdn.microsoft.com/en-us/library/system.windows.forms.sendkeys.send(v=vs.110).aspx
// https://msdn.microsoft.com/en-us/library/windows/desktop/dd375731(v=vs.85).aspx
var KeyMap = {
    tab: '{tab}', enter: '{enter}', space: '{space}',
    up: '{up}', down: '{down}', left: '{left}', right: '{right}', home: '{home}', end: '{end}', pgup: '{pgup}', pgdn: '{pgdn}',
    ins: '{ins}', del: '{del}', bs: '{bs}', esc: '{esc}',
    win: 0x5B, rwin: 0x5C,
    f1: '{f1}', f2: '{f2}', f3: '{f3}', f4: '{f4}', f5: '{f5}', f6: '{f6}', f7: '{f7}', f8: '{f8}', f9: '{f9}',
    f10: '{f10}', f11: '{f11}', f12: '{f12}', f13: '{f13}', f14: '{f14}', f15: '{f15}', f16: '{f16}',
    add: '{add}', subtract: '{subtract}', multiply: '{multiply}', divide: '{divide}',
    n0: '0', n1: '1', n2: '2', n3: '3', n4: '4',
    n5: '5', n6: '6', n7: '7', n8: '8', n9: '9'
};

var ModMap = {
    '^': '^',
    '+': '+',
    '%': '%',
    '^^': '^'
};

var TextReplaceRegex = /[\(\)\{}\[\]\+\^%~]/g;

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
    text = this.addMod(text.replace(TextReplaceRegex, function(match) { return '{' + match + '}'; }));
    this.pendingScript.push('text ' + text);
    this.callback();
};

AutoTypeEmitter.prototype.key = function(key) {
    if (typeof key !== 'number') {
        key = KeyMap[key];
        if (!key) {
            return this.callback('Bad key: ' + key);
        }
    }
    if (typeof key === 'number') {
        this.pendingScript.push('key ' + this.addMod('') + key);
    } else {
        var text = this.addMod(key);
        this.pendingScript.push('text ' + text);
    }
    this.callback();
};

AutoTypeEmitter.prototype.copyPaste = function(text) {
    this.pendingScript.push('copypaste ' + text);
    this.callback();
};

AutoTypeEmitter.prototype.wait = function(time) {
    this.pendingScript.push('wait ' + time);
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

AutoTypeEmitter.prototype.addMod = function(text) {
    var keys = Object.keys(this.mod);
    if (!keys.length || !text) {
        return text;
    }
    return keys.join('') + (text.length > 1 ? '(' + text + ')' : text);
};

AutoTypeEmitter.prototype.runScript = function(script) {
    Launcher.spawn({
        cmd: AutoTypeHelper.getHelperPath(),
        data: script,
        complete: this.callback
    });
};

module.exports = AutoTypeEmitter;

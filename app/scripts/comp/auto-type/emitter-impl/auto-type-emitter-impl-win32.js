'use strict';

var Launcher = require('../../launcher');

var spawn = Launcher.req('child_process').spawn;

var KeyMap = {
    tab: '{tab}', enter: '{enter}', space: '{space}',
    up: '{up}', down: '{down}', left: '{left}', right: '{right}', home: '{home}', end: '{end}', pgup: '{pgup}', pgdn: '{pgdn}',
    ins: '{ins}', del: '{del}', bs: '{bs}', esc: '{esc}',
    win: null, rwin: null,
    f1: '{f1}', f2: '{f2}', f3: '{f3}', f4: '{f4}', f5: '{f5}', f6: '{f6}', f7: '{f7}', f8: '{f8}', f9: '{f9}',
    f10: '{f10}', f11: '{f11}', f12: '{f12}', f13: '{f13}', f14: '{f14}', f15: '{f15}', f16: '{f16}',
    add: '{add}', subtract: '{subtract}', multiply: '{multiply}', divide: '{divide}',
    n0: '0', n1: '1', n2: '2', n3: '3', n4: '4',
    n5: '5', n6: '6', n7: '7', n8: '8', n9: '9'
};

var ModMap = {
    '^': '^',
    '+': '+',
    '%': '@',
    '^^': '^'
};

var TextReplaceRegex = /[\(\)\{}\[\]\+\^%~]/g;

var AutoTypeEmitterImpl = function() {
    this.mod = {};
    this.pendingScript = [];
};

AutoTypeEmitterImpl.prototype.setMod = function(mod, enabled) {
    if (enabled) {
        this.mod[ModMap[mod]] = true;
    } else {
        delete this.mod[ModMap[mod]];
    }
};

AutoTypeEmitterImpl.prototype.text = function(text, callback) {
    if (!text) {
        return callback();
    }
    text = this.addMod(this.replaceText(text));
    this.pendingScript.push(text);
    callback();
};

AutoTypeEmitterImpl.prototype.key = function(key, callback) {
    if (typeof key !== 'number') {
        key = KeyMap[key];
        if (key === null) {
            return callback();
        }
        if (!key) {
            return callback('Bad key: ' + key);
        }
    }
    var text = this.addMod(key);
    this.pendingScript.push(text);
    callback();
};

AutoTypeEmitterImpl.prototype.copyPaste = function(text, callback) {
    // todo
    this.pendingScript.push('^v');
    this.waitComplete(callback);
};

AutoTypeEmitterImpl.prototype.waitComplete = function(callback) {
    if (this.pendingScript.length) {
        var script = this.pendingScript.join('');
        this.pendingScript.length = 0;
        this.runScript(script, callback);
    } else {
        callback();
    }
};

AutoTypeEmitterImpl.prototype.addMod = function(text) {
    var keys = Object.keys(this.mod);
    if (!keys.length || !text) {
        return text;
    }
    return keys.join('') + (text.length > 1 ? '(' + text + ')' : text);
};

AutoTypeEmitterImpl.prototype.replaceText = function(text) {
    return text.replace(TextReplaceRegex, function(match) { return '{' + match + '}'; });
};

AutoTypeEmitterImpl.prototype.runScript = function(script, callback) {
    script = '& {' +
        '[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");' +
        '[System.Windows.Forms.SendKeys]::SendWait("' + script + '");' +
        '}';
    var ps = spawn('powershell', ['-Command', script]);
    ps.on('close', function(code) { callback(code ? 'Exit code ' + code : undefined); });
};

module.exports = AutoTypeEmitterImpl;

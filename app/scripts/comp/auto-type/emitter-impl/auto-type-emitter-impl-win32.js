'use strict';

var Launcher = require('../../launcher');

var spawn = Launcher.req('child_process').spawn;

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

var ModVk = {
    '+': 0x10,
    '^': 0x11,
    '%': 0x12
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
    text = this.addMod(this.escapeText(text.replace(TextReplaceRegex, function(match) { return '{' + match + '}'; })));
    this.pendingScript.push('[System.Windows.Forms.SendKeys]::SendWait("' + text + '");');
    callback();
};

AutoTypeEmitterImpl.prototype.key = function(key, callback) {
    if (typeof key !== 'number') {
        key = KeyMap[key];
        if (!key) {
            return callback('Bad key: ' + key);
        }
    }
    if (typeof key === 'number') {
        Object.keys(this.mod).forEach(function(mod) { this.pendingScript.push('[KwHelper]::Down(' + ModVk[mod] + ')'); }, this);
        this.pendingScript.push('[KwHelper]::Press(' + key + ')');
        Object.keys(this.mod).forEach(function(mod) { this.pendingScript.push('[KwHelper]::Up(' + ModVk[mod] + ')'); }, this);
    } else {
        var text = this.addMod(key);
        this.pendingScript.push('[System.Windows.Forms.SendKeys]::SendWait("' + text + '");');
    }
    callback();
};

AutoTypeEmitterImpl.prototype.copyPaste = function(text, callback) {
    this.pendingScript.push('[System.Threading.Thread]::Sleep(5000)');
    this.pendingScript.push('[System.Windows.Forms.Clipboard]::SetText("' + this.escapeText(text) + '")');
    this.pendingScript.push('[System.Threading.Thread]::Sleep(5000)');
    this.pendingScript.push('[System.Windows.Forms.SendKeys]::SendWait("+{ins}")');
    this.pendingScript.push('[System.Threading.Thread]::Sleep(5000)');
    this.waitComplete(callback);
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

AutoTypeEmitterImpl.prototype.escapeText = function(text) {
    return text.replace(/"/g, '`"').replace(/`/g, '``').replace(/\n/g, '``n');
};

AutoTypeEmitterImpl.prototype.addMod = function(text) {
    var keys = Object.keys(this.mod);
    if (!keys.length || !text) {
        return text;
    }
    return keys.join('') + (text.length > 1 ? '(' + text + ')' : text);
};

AutoTypeEmitterImpl.prototype.runScript = function(script, callback) {
    script = 'Add-Type @"\
using System;\
using System.Runtime.InteropServices;\
public static class KwHelper {\
    [DllImport("user32.dll")]\
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);\
    public static void Down(byte code) { keybd_event(code, 0, 1, UIntPtr.Zero); }\
    public static void Up(byte code) { keybd_event(code, 0, 3, UIntPtr.Zero); }\
    public static void Press(byte code) { Down(code); Up(code); }\
}\
"@\
[Console]::InputEncoding = [System.Text.Encoding]::UTF8\
[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")\n' + script;

    var ps = spawn('powershell', ['-Command', '-']);
    ps.stdin.setEncoding('utf-8');
    ps.stdin.write(script);
    ps.stdin.end();
    ps.on('close', function(code) { callback(code ? 'Exit code ' + code : undefined); });
};

module.exports = AutoTypeEmitterImpl;

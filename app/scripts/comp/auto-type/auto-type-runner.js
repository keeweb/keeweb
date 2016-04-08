'use strict';

var AutoTypeRunner = function(ops) {
    this.ops = ops;
    this.pendingResolves = 0;
};

AutoTypeRunner.PendingResolve = { pending: true };

AutoTypeRunner.Keys = {
    tab: 'tab', enter: 'enter', space: 'space',
    up: 'up', down: 'down', left: 'left', right: 'right', home: 'home', end: 'end', pgup: 'pgup', pgdn: 'pgdn',
    insert: 'ins', ins: 'ins', delete: 'del', del: 'del', backspace: 'bs', bs: 'bs', bksp: 'bs', esc: 'esc',
    win: 'win', lwin: 'win', rwin: 'rwin', f1: 'f1', f2: 'f2', f3: 'f3', f4: 'f4', f5: 'f5', f6: 'f6',
    f7: 'f7', f8: 'f8', f9: 'f9', f10: 'f10', f11: 'f11', f12: 'f12', f13: 'f13', f14: 'f14', f15: 'f15', f16: 'f16',
    add: 'add', subtract: 'subtract', multiply: 'multiply', divide: 'divide',
    numpad0: 'n0', numpad1: 'n1', numpad2: 'n2', numpad3: 'n3', numpad4: 'n4',
    numpad5: 'n5', numpad6: 'n6', numpad7: 'n7', numpad8: 'n8', numpad9: 'n9'
};

AutoTypeRunner.Substitutions = {
    title: function() {},
    username: function() {},
    url: function() {},
    password: function() {},
    notes: function() {},
    group: function() {},
    totp: function() {},
    s: function() {},
    'dt_simple': function() {},
    'dt_year': function() {},
    'dt_month': function() {},
    'dt_day': function() {},
    'dt_hour': function() {},
    'dt_minute': function() {},
    'dt_second': function() {},
    'dt_utc_simple': function() {},
    'dt_utc_year': function() {},
    'dt_utc_month': function() {},
    'dt_utc_day': function() {},
    'dt_utc_hour': function() {},
    'dt_utc_minute': function() {},
    'dt_utc_second': function() {}
};

AutoTypeRunner.Commands = {
    wait: function() {},
    setDelay: function() {}
};

AutoTypeRunner.prototype.resolve = function(entry, callback) {
    this.entry = entry;
    try {
        this.resolveOps(this.ops);
        if (!this.pendingResolves) {
            callback();
        } else {
            this.resolveCallback = callback;
        }
    } catch (e) {
        return callback(e);
    }
};

AutoTypeRunner.prototype.resolveOps = function(ops) {
    for (var i = 0, len = ops.length; i < len; i++) {
        this.resolveOp(ops[i]);
    }
};

AutoTypeRunner.prototype.resolveOp = function(op) {
    if (op.type === 'group') {
        this.resolveOps(op.value);
        return;
    }
    if (op.value.length === 1 && !op.sep) {
        // {x}
        op.type = 'text';
        return;
    }
    if (op.value.length === 1 && op.sep === ' ') {
        // {x 3}
        op.type = 'text';
        var ch = op.value, text = ch, len = +op.arg;
        while (text.length < len) {
            text += ch;
        }
        op.value = text;
        return;
    }
    var lowerValue = op.value.toLowerCase();
    var key = AutoTypeRunner.Keys[lowerValue];
    if (key) {
        if (op.sep === ' ' && +op.arg > 0) {
            // {TAB 3}
            op.type = 'group';
            op.value = [];
            var count = +op.arg;
            for (var i = 0; i < count; i++) {
                op.value.push({type: 'key', value: key});
            }
        } else {
            // {TAB}
            op.type = 'key';
            op.value = key;
        }
        return;
    }
    var substitution = AutoTypeRunner.Substitutions[lowerValue];
    if (substitution) {
        // {title}
        op.type = 'text';
        op.value = substitution(this, op);
        if (op.value === AutoTypeRunner.PendingResolve) {
            this.pendingResolves++;
        }
        return;
    }
    if (!this.tryParseCommand(op)) {
        throw 'Bad op: ' + op.value;
    }
};

AutoTypeRunner.prototype.tryParseCommand = function(op) {
    switch (op.value.toLowerCase()) {
        case 'clearfield':
            // {CLEARFIELD}
            op.type = 'group';
            op.value = [{ type: 'key', value: 'a', mod: { '^': true } }, { type: 'key', value: 'bs' }];
            return true;
        case 'vkey':
            // {VKEY 10} {VKEY 0x1F}
            op.type = 'key';
            op.value = parseInt(op.arg);
            if (isNaN(op.value) || op.value <= 0) {
                throw 'Bad vkey: ' + op.arg;
            }
            return true;
        case 'delay':
            // {DELAY 5} {DELAY=5}
            op.type = 'cmd';
            op.value = op.sep === '=' ? 'setDelay' : 'wait';
            if (!op.arg) {
                throw 'Delay requires seconds count';
            }
            if (isNaN(+op.arg)) {
                throw 'Bad delay: ' + op.arg;
            }
            if (op.arg <= 0) {
                throw 'Delay requires positive interval';
            }
            op.arg = +op.arg;
            return true;
        default:
            return false;
    }

};

AutoTypeRunner.prototype.run = function() {
};

module.exports = AutoTypeRunner;

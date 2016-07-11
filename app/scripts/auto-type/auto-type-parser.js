'use strict';

var AutoTypeRunner = require('./auto-type-runner');

var AutoTypeParser = function(sequence) {
    this.sequence = sequence;
    this.ix = 0;
    this.states = [];
};

AutoTypeParser.opSepRegex = /[\s:=]+/;

AutoTypeParser.prototype.parse = function() {
    var len = this.sequence.length;
    this.pushState();
    while (this.ix < len) {
        var ch = this.sequence[this.ix];
        switch (ch) {
            case '{':
                this.readOp();
                continue;
            case '+':
            case '%':
            case '^':
                this.readModifier(ch);
                break;
            case '(':
                this.pushState();
                break;
            case ')':
                this.popState();
                break;
            case ' ':
                break;
            case '~':
                this.addOp('enter');
                break;
            default:
                this.addChar(ch);
                break;
        }
        this.ix++;
    }
    if (this.states.length !== 1) {
        throw 'Groups count mismatch';
    }
    return new AutoTypeRunner(this.state().ops);
};

AutoTypeParser.prototype.pushState = function() {
    this.states.unshift({
        modifiers: null,
        ops: []
    });
};

AutoTypeParser.prototype.popState = function() {
    if (this.states.length <= 1) {
        throw 'Unexpected ")" at index ' + this.ix;
    }
    var state = this.states.shift();
    this.addState(state);
};

AutoTypeParser.prototype.state = function() {
    return this.states[0];
};

AutoTypeParser.prototype.readOp = function() {
    var toIx = this.sequence.indexOf('}', this.ix + 2);
    if (toIx < 0) {
        throw 'Mismatched "{" at index ' + this.ix;
    }
    var contents = this.sequence.substring(this.ix + 1, toIx);
    this.ix = toIx + 1;
    if (contents.length === 1) {
        this.addChar(contents);
        return;
    }
    var parts = contents.split(AutoTypeParser.opSepRegex, 2);
    if (parts.length > 1 && parts[0].length && parts[1].length) {
        var op = parts[0];
        var sep = contents.substr(op.length, 1);
        var arg = parts[1];
        this.addOp(op, sep, arg);
    } else {
        this.addOp(contents);
    }
};

AutoTypeParser.prototype.readModifier = function(modifier) {
    var state = this.state();
    if (!state.modifiers) {
        state.modifiers = {};
    }
    if (modifier === '^' && state.modifiers['^']) {
        delete state.modifiers['^'];
        modifier = '^^';
    }
    state.modifiers[modifier] = true;
};

AutoTypeParser.prototype.resetModifiers = function() {
    var state = this.state();
    var modifiers = state.modifiers;
    state.modifiers = null;
    return modifiers;
};

AutoTypeParser.prototype.addState = function(state) {
    this.state().ops.push({
        type: 'group',
        value: state.ops,
        mod: this.resetModifiers()
    });
};

AutoTypeParser.prototype.addChar = function(ch) {
    this.state().ops.push({
        type: 'text',
        value: ch,
        mod: this.resetModifiers()
    });
};

AutoTypeParser.prototype.addOp = function(op, sep, arg) {
    this.state().ops.push({
        type: 'op',
        value: op,
        mod: this.resetModifiers(),
        sep: sep,
        arg: arg
    });
};

module.exports = AutoTypeParser;

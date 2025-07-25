import { AutoTypeRunner } from 'auto-type/auto-type-runner';

const AutoTypeParser = function (sequence) {
    this.sequence = sequence;
    this.ix = 0;
    this.states = [];
};

AutoTypeParser.opRegex = /^(.*?)(?:([\s:=])[\s:=]*(.*))?$/;

AutoTypeParser.prototype.parse = function () {
    const len = this.sequence.length;
    this.pushState();
    while (this.ix < len) {
        const ch = this.sequence[this.ix];
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

AutoTypeParser.prototype.pushState = function () {
    this.states.unshift({
        modifiers: null,
        ops: []
    });
};

AutoTypeParser.prototype.popState = function () {
    if (this.states.length <= 1) {
        throw 'Unexpected ")" at index ' + this.ix;
    }
    const state = this.states.shift();
    this.addState(state);
};

AutoTypeParser.prototype.state = function () {
    return this.states[0];
};

AutoTypeParser.prototype.readOp = function () {
    const toIx = this.sequence.indexOf('}', this.ix + 2);
    if (toIx < 0) {
        throw 'Mismatched "{" at index ' + this.ix;
    }
    const contents = this.sequence.substring(this.ix + 1, toIx);
    this.ix = toIx + 1;
    if (contents.length === 1) {
        this.addChar(contents);
        return;
    }
    const [, op, sep, arg] = contents.match(AutoTypeParser.opRegex);
    this.addOp(op, sep, arg);
};

AutoTypeParser.prototype.readModifier = function (modifier) {
    const state = this.state();
    if (!state.modifiers) {
        state.modifiers = {};
    }
    if (modifier === '^' && state.modifiers['^']) {
        delete state.modifiers['^'];
        modifier = '^^';
    }
    state.modifiers[modifier] = true;
};

AutoTypeParser.prototype.resetModifiers = function () {
    const state = this.state();
    const modifiers = state.modifiers;
    state.modifiers = null;
    return modifiers;
};

AutoTypeParser.prototype.addState = function (state) {
    this.state().ops.push({
        type: 'group',
        value: state.ops,
        mod: this.resetModifiers()
    });
};

AutoTypeParser.prototype.addChar = function (ch) {
    this.state().ops.push({
        type: 'text',
        value: ch,
        mod: this.resetModifiers()
    });
};

AutoTypeParser.prototype.addOp = function (op, sep, arg) {
    this.state().ops.push({
        type: 'op',
        value: op,
        mod: this.resetModifiers(),
        sep,
        arg
    });
};

export { AutoTypeParser };

import { Logger } from 'util/logger';

const logger = new Logger(
    'auto-type-obfuscator',
    undefined,
    localStorage.debugAutoType ? Logger.Level.All : Logger.Level.Warn
);

const MaxFakeOps = 30;
const MaxSteps = 1000;
const MaxCopy = 2;
const FakeCharAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789O0oIl';

const AutoTypeObfuscator = function (chars) {
    this.chars = chars;
    this.inputChars = [];
    this.inputCursor = 0;
    this.inputSel = 0;
    this.ops = [];
    this.stepCount = 0;
    this.copyCount = 0;
};

AutoTypeObfuscator.prototype.obfuscate = function () {
    while (!this.finished()) {
        this.step();
        if (this.stepCount++ > MaxSteps) {
            throw 'Obfuscate failed';
        }
    }
    for (let i = 0; i < this.chars.length; i++) {
        this.chars[i] = null;
        this.inputChars[i] = null;
    }
    return this.ops;
};

AutoTypeObfuscator.prototype.finished = function () {
    return (
        this.chars.length === this.inputChars.length &&
        this.chars.every(function (ch, ix) {
            return this.inputChars[ix].ch === ch;
        }, this)
    );
};

AutoTypeObfuscator.prototype.step = function () {
    const isFake = this.stepCount < MaxFakeOps && Math.random() > this.stepCount / MaxFakeOps;
    if (isFake) {
        this.stepFake();
    } else {
        this.stepReal();
    }
    if (logger.getLevel() >= Logger.Level.Debug) {
        logger.debug('value', this.inputChars.map((ic) => ic.ch).join(''));
    }
};

AutoTypeObfuscator.prototype.stepFake = function () {
    const pos = Math.floor(Math.random() * (this.inputChars.length + 1));
    const ch = FakeCharAlphabet[Math.floor(Math.random() * FakeCharAlphabet.length)];
    logger.info('step.fake', pos, ch);
    this.moveToPos(pos);
    const insert = this.inputChars.length === 0 || Math.random() > 0.3;
    if (insert) {
        this.inputChar(ch);
    } else {
        let moveLeft = Math.random() > 0.5;
        let maxMove = moveLeft ? pos : this.inputChars.length - pos;
        if (maxMove === 0) {
            moveLeft = !moveLeft;
            maxMove = moveLeft ? pos : this.inputChars.length - pos;
        }
        const moveCount = Math.max(Math.floor(Math.pow(Math.random(), 3) * maxMove), 1);
        if (moveCount <= 1 && Math.random() > 0.5) {
            this.deleteText(moveLeft);
        } else {
            this.selectText(moveLeft, moveCount);
            if (Math.random() > 0.3) {
                this.deleteText(Math.random() > 0.5);
            } else {
                this.inputChar(ch);
            }
        }
    }
};

AutoTypeObfuscator.prototype.stepReal = function () {
    const possibleActions = [];
    const inputRealPositions = [];
    let i;
    for (i = 0; i < this.chars.length; i++) {
        inputRealPositions.push(-1);
    }
    for (i = 0; i < this.inputChars.length; i++) {
        const ix = this.inputChars[i].ix;
        if (ix === undefined) {
            possibleActions.push({ del: true, pos: i });
        } else {
            inputRealPositions[ix] = i;
        }
    }
    for (i = 0; i < this.chars.length; i++) {
        if (inputRealPositions[i] < 0) {
            let from = 0,
                to = this.inputChars.length;
            for (let j = 0; j < this.chars.length; j++) {
                if (j < i && inputRealPositions[j] >= 0) {
                    from = inputRealPositions[j] + 1;
                }
                if (j > i && inputRealPositions[j] >= 0) {
                    to = inputRealPositions[j];
                    break;
                }
            }
            possibleActions.push({ ins: true, ch: this.chars[i], ix: i, from, to });
        }
    }
    const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
    logger.info('step.real', inputRealPositions, action);
    if (action.del) {
        this.moveToPos(action.pos + 1);
        this.deleteText(true);
    } else {
        const insPos = action.from + Math.floor(Math.random() * (action.to - action.from));
        this.moveToPos(insPos);
        if (this.copyCount < MaxCopy && action.ch !== '\n' && Math.random() > 0.5) {
            this.copyCount++;
            this.copyPaste(action.ch);
        } else {
            this.inputChar(action.ch);
        }
        this.inputChars[insPos].ix = action.ix;
    }
};

AutoTypeObfuscator.prototype.moveToPos = function (pos) {
    logger.debug('moveToPos', pos);
    while (this.inputCursor > pos) {
        this.moveLeft();
    }
    while (this.inputCursor < pos) {
        this.moveRight();
    }
};

AutoTypeObfuscator.prototype.moveLeft = function () {
    logger.debug('moveLeft');
    this.ops.push({ type: 'key', value: 'left' });
    this.inputCursor--;
    this.inputSel = 0;
};

AutoTypeObfuscator.prototype.moveRight = function () {
    logger.debug('moveRight');
    this.ops.push({ type: 'key', value: 'right' });
    this.inputCursor++;
    this.inputSel = 0;
};

AutoTypeObfuscator.prototype.inputChar = function (ch) {
    logger.debug('inputChar', ch);
    this.ops.push({ type: 'text', value: ch });
    this.inputChars.splice(this.inputCursor, this.inputSel, { ch });
    this.inputCursor++;
    this.inputSel = 0;
};

AutoTypeObfuscator.prototype.copyPaste = function (ch) {
    logger.debug('copyPaste', ch);
    this.ops.push({ type: 'cmd', value: 'copyPaste', arg: ch });
    this.inputChars.splice(this.inputCursor, this.inputSel, { ch });
    this.inputCursor++;
    this.inputSel = 0;
};

AutoTypeObfuscator.prototype.selectText = function (backward, count) {
    logger.debug('selectText', backward ? 'left' : 'right', count);
    const ops = [];
    for (let i = 0; i < count; i++) {
        ops.push({ type: 'key', value: backward ? 'left' : 'right' });
    }
    if (ops.length === 1) {
        ops[0].mod = { '+': true };
        this.ops.push(ops[0]);
    } else {
        this.ops.push({ type: 'group', value: ops, mod: { '+': true } });
    }
    if (backward) {
        this.inputCursor -= count;
    }
    this.inputSel = count;
};

AutoTypeObfuscator.prototype.deleteText = function (backward) {
    logger.debug('deleteText', backward ? 'left' : 'right');
    this.ops.push({ type: 'key', value: backward ? 'bs' : 'del' });
    if (this.inputSel) {
        this.inputChars.splice(this.inputCursor, this.inputSel);
        this.inputSel = 0;
    } else {
        this.inputChars.splice(backward ? this.inputCursor - 1 : this.inputCursor, 1);
        if (backward) {
            this.inputCursor--;
        }
    }
};

export { AutoTypeObfuscator };

'use strict';

var Logger = require('../../util/logger');

var logger = new Logger('auto-type-obfuscator');
logger.setLevel(localStorage.autoTypeDebug ? Logger.Level.All : Logger.Level.Warn);

var MaxFakeOps = 50;
var MaxSteps = 1000;
var FakeCharAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789O0oIl';

var AutoTypeObfuscator = function(chars) {
    this.chars = chars;
    this.inputChars = [];
    this.inputCursor = 0;
    this.inputSel = 0;
    this.ops = [];
    this.stepCount = 0;
};

AutoTypeObfuscator.prototype.obfuscate = function() {
    while (!this.finished()) {
        this.step();
        if (this.stepCount++ > MaxSteps) {
            throw 'Obfuscate failed';
        }
    }
    for (var i = 0; i < this.chars.length; i++) {
        this.chars[i] = null;
        this.inputChars[i] = null;
    }
    return this.ops;
};

AutoTypeObfuscator.prototype.finished = function() {
    return this.chars.length === this.inputChars.length &&
        this.chars.every(function(ch, ix) { return this.inputChars[ix].ch === ch; }, this);
};

AutoTypeObfuscator.prototype.step = function() {
    var isFake = this.stepCount < MaxFakeOps && Math.random() > this.stepCount / MaxFakeOps;
    if (isFake) {
        this.stepFake();
    } else {
        this.stepReal();
    }
    if (logger.getLevel() >= Logger.Level.Debug) {
        logger.debug('value', this.inputChars.map(ic => ic.ch).join(''));
    }
};

AutoTypeObfuscator.prototype.stepFake = function() {
    var pos = Math.floor(Math.random() * (this.inputChars.length + 1));
    var ch = FakeCharAlphabet[Math.floor(Math.random() * FakeCharAlphabet.length)];
    logger.info('step.fake', pos, ch);
    this.moveToPos(pos);
    var insert = this.inputChars.length === 0 || Math.random() > 0.3;
    if (insert) {
        if (Math.random() > 0.1) {
            this.inputChar(ch);
        } else {
            this.copyPaste(ch);
        }
    } else {
        var moveLeft = pos > 0 && Math.random() > 0.5;
        var maxMove = moveLeft ? pos : this.inputChars.length - pos;
        var moveCount = Math.max(Math.floor(Math.pow(Math.random(), 3) * maxMove), 1);
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

AutoTypeObfuscator.prototype.stepReal = function() {
    var possibleActions = [];
    var inputRealPositions = [];
    var i;
    for (i = 0; i < this.chars.length; i++) {
        inputRealPositions.push(-1);
    }
    for (i = 0; i < this.inputChars.length; i++) {
        var ix = this.inputChars[i].ix;
        if (ix === undefined) {
            possibleActions.push({ del: true, pos: i });
        } else {
            inputRealPositions[ix] = i;
        }
    }
    for (i = 0; i < this.chars.length; i++) {
        if (inputRealPositions[i] < 0) {
            var from = 0, to = this.inputChars.length;
            for (var j = 0; j < this.chars.length; j++) {
                if (j < i && inputRealPositions[j] >= 0) {
                    from = inputRealPositions[j] + 1;
                }
                if (j > i && inputRealPositions[j] >= 0) {
                    to = inputRealPositions[j];
                    break;
                }
            }
            possibleActions.push({ ins: true, ch: this.chars[i], ix: i, from: from, to: to });
        }
    }
    var action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
    logger.info('step.real', inputRealPositions, action);
    if (action.del) {
        this.moveToPos(action.pos + 1);
        this.deleteText(true);
    } else {
        var insPos = action.from + Math.floor(Math.random() * (action.to - action.from));
        this.moveToPos(insPos);
        if (Math.random() > 0.5) {
            this.inputChar(action.ch);
        } else {
            this.copyPaste(action.ch);
        }
        this.inputChars[insPos].ix = action.ix;
    }
};

AutoTypeObfuscator.prototype.moveToPos = function(pos) {
    logger.debug('moveToPos', pos);
    while (this.inputCursor > pos) {
        this.moveLeft();
    }
    while (this.inputCursor < pos) {
        this.moveRight();
    }
};

AutoTypeObfuscator.prototype.moveLeft = function() {
    logger.debug('moveLeft');
    this.ops.push({ type: 'key', value: 'left' });
    this.inputCursor--;
    this.inputSel = 0;
};

AutoTypeObfuscator.prototype.moveRight = function() {
    logger.debug('moveRight');
    this.ops.push({ type: 'key', value: 'right' });
    this.inputCursor++;
    this.inputSel = 0;
};

AutoTypeObfuscator.prototype.inputChar = function(ch) {
    logger.debug('inputChar', ch);
    this.ops.push({ type: 'text', value: ch });
    this.inputChars.splice(this.inputCursor, this.inputSel, { ch: ch });
    this.inputCursor++;
    this.inputSel = 0;
};

AutoTypeObfuscator.prototype.copyPaste = function(ch) {
    logger.debug('copyPaste', ch);
    this.ops.push({type: 'copyText', value: ch});
    this.ops.push({type: 'waitComplete', value: ch});
    this.ops.push({type: 'key', value: 'v', mod: {'^': true}});
    this.inputChars.splice(this.inputCursor, this.inputSel, { ch: ch });
    this.inputCursor++;
    this.inputSel = 0;
};

AutoTypeObfuscator.prototype.selectText = function(backward, count) {
    logger.debug('selectText', backward ? 'left' : 'right', count);
    var ops = [];
    for (var i = 0; i < count; i++) {
        ops.push({ type: 'key', value: backward ? 'left' : 'right' });
    }
    if (ops.length === 1) {
        ops[0].mod = {'+': true};
        this.ops.push(ops[0]);
    } else {
        this.ops.push({type: 'group', value: ops, mod: {'+': true}});
    }
    if (backward) {
        this.inputCursor -= count;
    }
    this.inputSel = count;
};

AutoTypeObfuscator.prototype.deleteText = function(backward) {
    logger.debug('deleteText', backward ? 'left' : 'right');
    this.ops.push({ type: 'key', value: backward ? 'bs' : 'del' });
    var deleteCount = this.inputSel || 1;
    this.inputChars.splice(backward ? this.inputCursor - deleteCount : this.inputCursor, deleteCount);
    if (backward) {
        this.inputCursor--;
    }
    this.inputSel = 0;
};

module.exports = AutoTypeObfuscator;

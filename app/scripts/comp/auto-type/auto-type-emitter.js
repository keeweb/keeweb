'use strict';

var Logger = require('../../util/logger'),
    Launcher = require('../launcher'),
    AutoTypeEmitterImplFactory = require('./auto-type-emitter-impl-factory');

var logger = new Logger('auto-type-emitter');
logger.setLevel(localStorage.autoTypeDebug ? Logger.Level.All : Logger.Level.Warn);

var AutoTypeEmitter = function(callback) {
    this.callback = callback;
    this.mod = {};
    this.impl = AutoTypeEmitterImplFactory.create();
    this.delay = 0;
};

AutoTypeEmitter.prototype.setMod = function(mod, enabled) {
    logger.debug('Mod', mod, enabled);
    if (enabled) {
        this.mod[mod] = true;
    } else {
        delete this.mod[mod];
    }
    this.impl.setMod(mod, enabled);
};

AutoTypeEmitter.prototype.text = function(text) {
    logger.debug('Text', text);
    setTimeout(this.impl.text.bind(this.impl, text, this.callback), this.delay);
};

AutoTypeEmitter.prototype.key = function(key) {
    logger.debug('Key', key);
    setTimeout(this.impl.key.bind(this.impl, key, this.callback), this.delay);
};

AutoTypeEmitter.prototype.wait = function(time) {
    logger.debug('Wait', time);
    setTimeout(this.callback, time);
};

AutoTypeEmitter.prototype.setDelay = function(delay) {
    logger.debug('Set delay', delay);
    this.delay = delay || 0;
    this.callback();
};

AutoTypeEmitter.prototype.copyText = function(text) {
    logger.debug('Copy text', text);
    Launcher.setClipboardText(text);
    this.callback();
};

AutoTypeEmitter.prototype.waitComplete = function() {
    logger.debug('Wait complete');
    this.impl.waitComplete(this.callback);
};

module.exports = AutoTypeEmitter;

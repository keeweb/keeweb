'use strict';

var Logger = require('../../util/logger');

var logger = new Logger('auto-type-emitter');
logger.setLevel(localStorage.autoTypeDebug ? Logger.Level.All : Logger.Level.Warn);

var AutoTypeEmitter = function(callback) {
    this.callback = callback;
    this.mod = {};
};

AutoTypeEmitter.prototype.setMod = function(mod, enabled) {
    logger.debug('Mod', mod, enabled);
    if (enabled) {
        this.mod[mod] = true;
    } else {
        delete this.mod[mod];
    }
};

AutoTypeEmitter.prototype.text = function(text) {
    logger.debug('Text', text);
    this.callback();
};

AutoTypeEmitter.prototype.key = function(key) {
    logger.debug('Key', key);
    this.callback();
};

AutoTypeEmitter.prototype.wait = function(time) {
    logger.debug('Wait', time);
    this.callback();
};

AutoTypeEmitter.prototype.setDelay = function(delay) {
    logger.debug('Set delay', delay);
    this.callback();
};

AutoTypeEmitter.prototype.copyText = function(text) {
    logger.debug('Copy text', text);
    this.callback();
};

AutoTypeEmitter.prototype.waitComplete = function() {
    logger.debug('Wait complete');
    this.callback();
};

module.exports = AutoTypeEmitter;

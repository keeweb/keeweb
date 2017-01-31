'use strict';

var Launcher = require('../comp/launcher');

var AutoTypeEmitterFactory = {
    create: function(callback) {
        if (Launcher && Launcher.autoTypeSupported) {
            var AutoTypeEmitter = require('./emitter/auto-type-emitter-' + Launcher.platform());
            return new AutoTypeEmitter(callback);
        }
        return null;
    }
};

module.exports = AutoTypeEmitterFactory;

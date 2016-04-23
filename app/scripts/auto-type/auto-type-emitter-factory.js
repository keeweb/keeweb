'use strict';

var Launcher = require('../comp/launcher');

var AutoTypeEmitterFactory = {
    create: function(callback) {
        if (!Launcher) {
            return null;
        }
        var AutoTypeEmitter = require('./emitter/auto-type-emitter-' + Launcher.platform());
        return new AutoTypeEmitter(callback);
    }
};

module.exports = AutoTypeEmitterFactory;

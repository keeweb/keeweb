'use strict';

const Launcher = require('../comp/launcher');

const AutoTypeEmitterFactory = {
    create: function(callback) {
        if (!Launcher) {
            return null;
        }
        const AutoTypeEmitter = require('./emitter/auto-type-emitter-' + Launcher.platform());
        return new AutoTypeEmitter(callback);
    }
};

module.exports = AutoTypeEmitterFactory;

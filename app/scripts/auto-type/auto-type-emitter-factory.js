const Launcher = require('../comp/launcher');

const AutoTypeEmitterFactory = {
    create: function(callback) {
        if (Launcher && Launcher.autoTypeSupported) {
            const AutoTypeEmitter = require('./emitter/auto-type-emitter-' + Launcher.platform());
            return new AutoTypeEmitter(callback);
        }
        return null;
    }
};

module.exports = AutoTypeEmitterFactory;

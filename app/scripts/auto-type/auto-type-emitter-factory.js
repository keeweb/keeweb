import Launcher from '../comp/launcher';

const AutoTypeEmitterFactory = {
    create: function(callback) {
        if (Launcher && Launcher.autoTypeSupported) {
            const AutoTypeEmitter = require('./emitter/auto-type-emitter-' + Launcher.platform()).default;
            return new AutoTypeEmitter(callback);
        }
        return null;
    }
};

export default AutoTypeEmitterFactory;

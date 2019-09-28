import { Launcher } from 'comp/launcher';

const AutoTypeEmitterFactory = {
    create(callback) {
        if (Launcher && Launcher.autoTypeSupported) {
            const { AutoTypeEmitter } = require('./emitter/auto-type-emitter-' +
                Launcher.platform());
            return new AutoTypeEmitter(callback);
        }
        return null;
    }
};

export { AutoTypeEmitterFactory };

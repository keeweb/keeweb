import { Launcher } from 'comp/launcher';

const AutoTypeEmitterFactory = {
    create(callback, windowID) {
        if (Launcher && Launcher.autoTypeSupported) {
            const { AutoTypeEmitter } = require('./emitter/auto-type-emitter-' +
                Launcher.platform());
            if (Launcher.platform() === 'linux') {
                return new AutoTypeEmitter(callback, windowID);
            }
            return new AutoTypeEmitter(callback);
        }
        return null;
    }
};

export { AutoTypeEmitterFactory };

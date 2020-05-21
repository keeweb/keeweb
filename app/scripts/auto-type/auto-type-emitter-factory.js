import { Launcher } from 'comp/launcher';

const AutoTypeEmitterFactory = {
    create(callback, windowId) {
        if (Launcher && Launcher.autoTypeSupported) {
            const { AutoTypeEmitter } = require('./emitter/auto-type-emitter-' +
                Launcher.platform());
            return new AutoTypeEmitter(callback, windowId);
        }
        return null;
    }
};

export { AutoTypeEmitterFactory };

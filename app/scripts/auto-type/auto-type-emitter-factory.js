import { Launcher } from 'comp/launcher';
import { AppSettingsModel } from 'models/app-settings-model';
import { AutoTypeEmitter } from 'auto-type/auto-type-emitter';

const AutoTypeEmitterFactory = {
    create(callback, windowId) {
        if (Launcher && Launcher.autoTypeSupported) {
            if (AppSettingsModel.useLegacyAutoType) {
                const { AutoTypeEmitter } = require('./emitter/auto-type-emitter-' +
                    Launcher.platform());
                return new AutoTypeEmitter(callback, windowId);
            }
            return new AutoTypeEmitter(callback, windowId);
        }
        return null;
    }
};

export { AutoTypeEmitterFactory };

import { Launcher } from 'comp/launcher';
import { AppSettingsModel } from 'models/app-settings-model';
import { AutoTypeHelper } from 'auto-type/auto-type-helper';

const AutoTypeHelperFactory = {
    create() {
        if (Launcher && Launcher.autoTypeSupported) {
            if (AppSettingsModel.useLegacyAutoType) {
                const { AutoTypeHelper } = require('./helper/auto-type-helper-' +
                    Launcher.platform());
                return new AutoTypeHelper();
            }
            return new AutoTypeHelper();
        }
        return null;
    }
};

export { AutoTypeHelperFactory };

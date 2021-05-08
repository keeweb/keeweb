import { AppSettingsModel } from 'models/app-settings-model';
import { RuntimeDataModel } from 'models/runtime-data-model';

const ExportApi = {
    settings: {
        get(key) {
            return key ? AppSettingsModel[key] : { ...AppSettingsModel };
        },
        set(key, value) {
            AppSettingsModel[key] = value;
        },
        del(key) {
            delete AppSettingsModel[key];
        }
    },
    runtimeData: {
        get(key) {
            return key ? RuntimeDataModel[key] : { ...RuntimeDataModel };
        },
        set(key, value) {
            RuntimeDataModel[key] = value;
        },
        del(key) {
            delete RuntimeDataModel[key];
        }
    }
};

export { ExportApi };

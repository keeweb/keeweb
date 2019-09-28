import { AppSettingsModel } from 'models/app-settings-model';

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
    }
};

export { ExportApi };

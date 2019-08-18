const AppSettingsModel = require('../models/app-settings-model');

const ExportApi = {
    settings: {
        get(key) {
            return key ? AppSettingsModel.instance.get(key) : AppSettingsModel.instance.toJSON();
        },
        set(key, value) {
            AppSettingsModel.instance.set(key, value);
        },
        del(key) {
            AppSettingsModel.instance.unset(key);
        }
    }
};

module.exports = ExportApi;

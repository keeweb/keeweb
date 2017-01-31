'use strict';

const AppSettingsModel = require('../models/app-settings-model');

const ExportApi = {
    settings: {
        get: function(key) { return key ? AppSettingsModel.instance.get(key) : AppSettingsModel.instance.toJSON(); },
        set: function(key, value) { AppSettingsModel.instance.set(key, value); }
    }
};

module.exports = ExportApi;

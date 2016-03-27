'use strict';

var Backbone = require('backbone'),
    Logger = require('../util/logger'),
    AppSettingsModel = require('../models/app-settings-model');

var StorageBase = function() {
};

_.extend(StorageBase.prototype, {
    name: null,
    icon: null,
    iconSvg: null,
    enabled: false,
    system: false,
    uipos: null,

    logger: null,
    appSettings: AppSettingsModel.instance,

    init: function() {
        if (!this.name) {
            throw 'Failed to init provider: no name';
        }
        if (!this.system) {
            var enabled = this.appSettings.get(this.name);
            if (typeof enabled === 'boolean') {
                this.enabled = enabled;
            }
        }
        this.logger = new Logger('storage-' + this.name);
    }
});

StorageBase.extend = Backbone.Model.extend;

module.exports = StorageBase;

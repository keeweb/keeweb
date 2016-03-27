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
        return this;
    },

    _xhr: function(config) {
        var xhr = new XMLHttpRequest();
        if (config.responseType) {
            xhr.responseType = config.responseType;
        }
        var statuses = config.statuses || [200];
        xhr.addEventListener('load', function() {
            if (statuses.indexOf(xhr.status) < 0) {
                return config.error && config.error('http status ' + xhr.status, xhr);
            }
            return config.success && config.success(xhr.response, xhr);
        });
        xhr.addEventListener('error', function() {
            return config.error && config.error('network error');
        });
        xhr.addEventListener('timeout', function() {
            return config.error && config.error('timeout');
        });
        xhr.open(config.method || 'GET', config.url);
        _.forEach(config.headers, function(value, key) {
            xhr.setRequestHeader(key, value);
        });
        xhr.send(config.data);
    }
});

StorageBase.extend = Backbone.Model.extend;

module.exports = StorageBase;

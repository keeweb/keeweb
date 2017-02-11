'use strict';

const AppSettingsModel = require('../models/app-settings-model');

const Libs = {
    backbone: require('backbone'),
    _: require('underscore'),
    underscore: require('underscore'),
    $: require('jquery'),
    jquery: require('jquery'),
    kdbxweb: require('kdbxweb'),
    hbs: require('hbs'),
    pikaday: require('pikaday'),
    filesaver: require('filesaver'),
    qrcode: require('qrcode')
};

const ExportApi = {
    settings: {
        get: function(key) { return key ? AppSettingsModel.instance.get(key) : AppSettingsModel.instance.toJSON(); },
        set: function(key, value) { AppSettingsModel.instance.set(key, value); }
    },
    require: function(module) {
        return Libs[module] || require('../' + module);
    }
};

module.exports = ExportApi;

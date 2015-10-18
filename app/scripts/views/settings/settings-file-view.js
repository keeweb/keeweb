'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../../util/feature-detector'),
    Alerts = require('../../util/alerts'),
    FileSaver = require('filesaver');

var SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-file.html'),

    events: {
        'click .settings__file-button-save-file': 'saveToFile',
        'click .settings__file-button-export-xml': 'exportAsXml',
        'click .settings__file-button-save-dropbox': 'saveToDropbox'
    },

    render: function() {
        this.renderTemplate({
            file: this.model,
            cmd: FeatureDetector.actionShortcutSymbol(true)
        });
    },

    saveToFile: function() {
        var data = this.model.getData();
        var blob = new Blob([data], {type: 'application/octet-stream'});
        FileSaver.saveAs(blob, this.model.get('name') + '.kdbx');
    },

    exportAsXml: function() {
        var data = this.model.getXml();
        var blob = new Blob([data], {type: 'text/xml'});
        FileSaver.saveAs(blob, this.model.get('name') + '.xml');
    },

    saveToDropbox: function() {
        Alerts.notImplemented();
    }
});

module.exports = SettingsAboutView;

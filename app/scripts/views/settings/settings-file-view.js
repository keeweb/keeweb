'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../../util/feature-detector'),
    PasswordDisplay = require('../../util/password-display'),
    Alerts = require('../../util/alerts'),
    RuntimeInfo = require('../../util/runtime-info'),
    FileSaver = require('filesaver');

var SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-file.html'),

    events: {
        'click .settings__file-button-save-file': 'saveToFile',
        'click .settings__file-button-export-xml': 'exportAsXml',
        'click .settings__file-button-save-dropbox': 'saveToDropbox',
        'change #settings__file-key-file': 'keyfileChange',
        'focus #settings__file-master-pass': 'focusMasterPass',
        'blur #settings__file-master-pass': 'blurMasterPass'
    },

    initialize: function() {
    },

    render: function() {
        this.renderTemplate({
            cmd: FeatureDetector.actionShortcutSymbol(true),
            supportFiles: RuntimeInfo.launcher,

            name: this.model.get('name'),
            path: this.model.get('path'),
            password: PasswordDisplay.present(this.model.get('passwordLength')),
            defaultUser: this.model.get('defaultUser'),
            recycleBinEnabled: this.model.get('recycleBinEnabled'),
            historyMaxItems: this.model.get('historyMaxItems'),
            historyMaxSize: Math.round(this.model.get('historyMaxSize') / 1024 / 1024),
            keyEncryptionRounds: this.model.get('keyEncryptionRounds')
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
    },

    keyfileChange: function(e) {
        switch (e.target.value) {
            case 'ex':
                this.useExistingKeyFile();
                break;
            case 'sel':
                this.selectKeyFile();
                break;
            case 'gen':
                this.generateKeyFile();
                break;
            default:
                this.clearKeyFile();
                break;
        }
    },

    useExistingKeyFile: function() {
    },

    selectKeyFile: function() {
    },

    generateKeyFile: function() {
    },

    clearKeyFile: function() {
    },

    focusMasterPass: function(e) {
        if (!this.passwordChanged) {
            e.target.value = '';
        }
        e.target.setAttribute('type', 'text');
    },

    blurMasterPass: function(e) {
        if (!e.target.value) {
            this.passwordChanged = false;
            e.target.value = PasswordDisplay.present(this.model.get('passwordLength'));
        } else {
            this.passwordChanged = true;
        }
        e.target.setAttribute('type', 'password');
    }
});

module.exports = SettingsAboutView;

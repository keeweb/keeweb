'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../../util/feature-detector'),
    PasswordGenerator = require('../../util/password-generator'),
    Alerts = require('../../comp/alerts'),
    Launcher = require('../../comp/launcher'),
    Storage = require('../../storage'),
    Links = require('../../const/links'),
    DropboxLink = require('../../comp/dropbox-link'),
    Format = require('../../util/format'),
    Locale = require('../../util/locale'),
    kdbxweb = require('kdbxweb'),
    FileSaver = require('filesaver');

var SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-file.hbs'),

    events: {
        'click .settings__file-button-save-default': 'saveDefault',
        'click .settings__file-button-save-file': 'saveToFile',
        'click .settings__file-button-export-xml': 'exportAsXml',
        'click .settings__file-button-save-dropbox': 'saveToDropbox',
        'click .settings__file-button-close': 'closeFile',
        'change #settings__file-key-file': 'keyFileChange',
        'click #settings__file-file-select-link': 'triggerSelectFile',
        'change #settings__file-file-select': 'fileSelected',
        'focus #settings__file-master-pass': 'focusMasterPass',
        'blur #settings__file-master-pass': 'blurMasterPass',
        'blur #settings__file-name': 'blurName',
        'blur #settings__file-def-user': 'blurDefUser',
        'change #settings__file-trash': 'changeTrash',
        'blur #settings__file-hist-len': 'blurHistoryLength',
        'blur #settings__file-hist-size': 'blurHistorySize',
        'blur #settings__file-key-rounds': 'blurKeyRounds'
    },

    appModel: null,

    initialize: function() {
        this.listenTo(this.model, 'change:syncing change:syncError change:syncDate', this.render);
    },

    render: function() {
        this.renderTemplate({
            cmd: FeatureDetector.actionShortcutSymbol(true),
            supportFiles: !!Launcher,
            desktopLink: Links.Desktop,

            name: this.model.get('name'),
            path: this.model.get('path'),
            storage: this.model.get('storage'),
            syncing: this.model.get('syncing'),
            syncError: this.model.get('syncError'),
            syncDate: Format.dtStr(this.model.get('syncDate')),
            password: PasswordGenerator.present(this.model.get('passwordLength')),
            defaultUser: this.model.get('defaultUser'),
            recycleBinEnabled: this.model.get('recycleBinEnabled'),
            historyMaxItems: this.model.get('historyMaxItems'),
            historyMaxSize: Math.round(this.model.get('historyMaxSize') / 1024 / 1024),
            keyEncryptionRounds: this.model.get('keyEncryptionRounds')
        });
        if (!this.model.get('created')) {
            this.$el.find('.settings__file-master-pass-warning').toggle(this.model.get('passwordChanged'));
        }
        this.renderKeyFileSelect();
    },

    renderKeyFileSelect: function() {
        var keyFileName = this.model.get('keyFileName'),
            oldKeyFileName = this.model.get('oldKeyFileName'),
            keyFileChanged = this.model.get('keyFileChanged');
        var sel = this.$el.find('#settings__file-key-file');
        sel.html('');
        if (keyFileName && keyFileChanged) {
            var text = keyFileName !== 'Generated' ? Locale.setFileUseKeyFile + ' ' + keyFileName : Locale.setFileUseGenKeyFile;
            $('<option/>').val('ex').text(text).appendTo(sel);
        }
        if (oldKeyFileName) {
            var useText = keyFileChanged ? Locale.setFileUseOldKeyFile : Locale.setFileUseKeyFile + ' ' + oldKeyFileName;
            $('<option/>').val('old').text(useText).appendTo(sel);
        }
        $('<option/>').val('gen').text(Locale.setFileGenKeyFile).appendTo(sel);
        $('<option/>').val('none').text(Locale.setFileDontUseKeyFile).appendTo(sel);
        if (keyFileName && keyFileChanged) {
            sel.val('ex');
        } else if (!keyFileName) {
            sel.val('none');
        } else if (oldKeyFileName && keyFileName === oldKeyFileName && !keyFileChanged) {
            sel.val('old');
        }
    },

    validatePassword: function(continueCallback) {
        if (!this.model.get('passwordLength')) {
            var that = this;
            Alerts.yesno({
                header: Locale.setFileEmptyPass,
                body: Locale.setFileEmptyPassBody,
                success: function() {
                    continueCallback();
                },
                cancel: function() {
                    that.$el.find('#settings__file-master-pass').focus();
                }
            });
            return false;
        }
        return true;
    },

    save: function(arg) {
        var that = this;
        if (!arg) {
            arg = {};
        }
        arg.startedByUser = true;
        if (!arg.skipValidation) {
            var isValid = this.validatePassword(function() {
                arg.skipValidation = true;
                that.save(arg);
            });
            if (!isValid) {
                return;
            }
        }
        this.appModel.syncFile(this.model, arg);
    },

    saveDefault: function() {
        this.save();
    },

    saveToFile: function(skipValidation) {
        if (skipValidation !== true && !this.validatePassword(this.saveToFile.bind(this, true))) {
            return;
        }
        var fileName = this.model.get('name') + '.kdbx';
        var that = this;
        if (Launcher && !this.model.get('storage')) {
            Launcher.getSaveFileName(fileName, function (path) {
                if (path) {
                    that.save({storage: 'file', path: path});
                }
            });
        } else {
            this.model.getData(function (data) {
                if (Launcher) {
                    Launcher.getSaveFileName(fileName, function (path) {
                        if (path) {
                            Storage.file.save(path, data, function (err) {
                                if (err) {
                                    Alerts.error({
                                        header: Locale.setFileSaveError,
                                        body: Locale.setFileSaveErrorBody + ' ' + path + ': \n' + err
                                    });
                                }
                            });
                        }
                    });
                } else {
                    var blob = new Blob([data], {type: 'application/octet-stream'});
                    FileSaver.saveAs(blob, fileName);
                }
            });
        }
    },

    exportAsXml: function() {
        this.model.getXml((function(xml) {
            var blob = new Blob([xml], {type: 'text/xml'});
            FileSaver.saveAs(blob, this.model.get('name') + '.xml');
        }).bind(this));
    },

    saveToDropbox: function() {
        var that = this;
        this.model.set('syncing', true);
        DropboxLink.authenticate(function(err) {
            that.model.set('syncing', false);
            if (err) {
                return;
            }
            if (that.model.get('storage') === 'dropbox') {
                that.save();
            } else {
                that.model.set('syncing', true);
                DropboxLink.getFileList(function(err, files) {
                    that.model.set('syncing', false);
                    if (!files) { return; }
                    var expName = that.model.get('name').toLowerCase();
                    var existingPath = files.filter(function(f) { return f.toLowerCase().replace('/', '') === expName; })[0];
                    if (existingPath) {
                        Alerts.yesno({
                            icon: 'dropbox',
                            header: Locale.setFileAlreadyExists,
                            body: Locale.setFileAlreadyExistsBody.replace('{}', that.model.escape('name')),
                            success: function() {
                                that.model.set('syncing', true);
                                DropboxLink.deleteFile(existingPath, function(err) {
                                    that.model.set('syncing', false);
                                    if (!err) {
                                        that.save({storage: 'dropbox'});
                                    }
                                });
                            }
                        });
                    } else {
                        that.save({storage: 'dropbox'});
                    }
                });
            }
        });
    },

    closeFile: function() {
        if (this.model.get('modified')) {
            var that = this;
            Alerts.yesno({
                header: Locale.setFileUnsaved,
                body: Locale.setFileUnsavedBody,
                buttons: [
                    {result: 'close', title: Locale.setFileCloseNoSave, error: true},
                    {result: '', title: Locale.setFileDontClose}
                ],
                success: function(result) {
                    if (result === 'close') {
                        that.closeFileNoCheck();
                    }
                }
            });
        } else {
            this.closeFileNoCheck();
        }
    },

    closeFileNoCheck: function() {
        this.appModel.closeFile(this.model);
    },

    keyFileChange: function(e) {
        switch (e.target.value) {
            case 'old':
                this.selectOldKeyFile();
                break;
            case 'gen':
                this.generateKeyFile();
                break;
            case 'none':
                this.clearKeyFile();
                break;
        }
    },

    selectOldKeyFile: function() {
        this.model.resetKeyFile();
        this.renderKeyFileSelect();
    },

    generateKeyFile: function() {
        var keyFile = this.model.generateAndSetKeyFile();
        var blob = new Blob([keyFile], {type: 'application/octet-stream'});
        FileSaver.saveAs(blob, this.model.get('name') + '.key');
        this.renderKeyFileSelect();
    },

    clearKeyFile: function() {
        this.model.removeKeyFile();
        this.renderKeyFileSelect();
    },

    triggerSelectFile: function() {
        this.$el.find('#settings__file-file-select').click();
    },

    fileSelected: function(e) {
        var file = e.target.files[0];
        var reader = new FileReader();
        reader.onload = (function(e) {
            var res = e.target.result;
            this.model.setKeyFile(res, file.name);
            this.renderKeyFileSelect();
        }).bind(this);
        reader.readAsArrayBuffer(file);
    },

    focusMasterPass: function(e) {
        e.target.value = '';
        e.target.setAttribute('type', 'text');
    },

    blurMasterPass: function(e) {
        if (!e.target.value) {
            this.model.resetPassword();
            e.target.value = PasswordGenerator.present(this.model.get('passwordLength'));
            this.$el.find('.settings__file-master-pass-warning').hide();
        } else {
            this.model.setPassword(kdbxweb.ProtectedValue.fromString(e.target.value));
            if (!this.model.get('created')) {
                this.$el.find('.settings__file-master-pass-warning').show();
            }
        }
        e.target.setAttribute('type', 'password');
    },

    blurName: function(e) {
        var value = $.trim(e.target.value);
        if (!value) {
            e.target.value = this.model.get('name');
            return;
        }
        this.model.setName(value);
    },

    blurDefUser: function(e) {
        var value = $.trim(e.target.value);
        this.model.setDefaultUser(value);
    },

    changeTrash: function(e) {
        this.model.setRecycleBinEnabled(e.target.checked);
    },

    blurHistoryLength: function(e) {
        var value = +e.target.value;
        if (isNaN(value)) {
            e.target.value = this.model.get('historyMaxItems');
            return;
        }
        this.model.setHistoryMaxItems(value);
    },

    blurHistorySize: function(e) {
        var value = +e.target.value;
        if (isNaN(value)) {
            e.target.value = this.model.get('historyMaxSize') / 1024 / 1024;
            return;
        }
        this.model.setHistoryMaxSize(value * 1024 * 1024);
    },

    blurKeyRounds: function(e) {
        var value = +e.target.value;
        if (isNaN(value)) {
            e.target.value = this.model.get('keyEncryptionRounds');
            return;
        }
        this.model.setKeyEncryptionRounds(value);
    }
});

module.exports = SettingsAboutView;

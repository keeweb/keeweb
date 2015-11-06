'use strict';

var Backbone = require('backbone'),
    Keys = require('../const/keys'),
    Alerts = require('../comp/alerts'),
    SecureInput = require('../comp/secure-input'),
    FileModel = require('../models/file-model'),
    Launcher = require('../comp/launcher'),
    DropboxLink = require('../comp/dropbox-link');

var OpenView = Backbone.View.extend({
    template: require('templates/open.html'),

    events: {
        'change .open__file-ctrl': 'fileSelected',
        'click .open__icon-open': 'openFile',
        'click .open__icon-new': 'createNew',
        'click .open__icon-dropbox': 'openFromDropbox',
        'click .open__icon-demo': 'createDemo',
        'click .open__pass-input[readonly]': 'openFile',
        'input .open__pass-input': 'inputInput',
        'keydown .open__pass-input': 'inputKeydown',
        'keypress .open__pass-input': 'inputKeypress',
        'click .open__pass-enter-btn': 'openDb',
        'click .open__settings-key-file': 'openKeyFile',
        'change .open__settings-check-offline': 'changeOffline',
        'click .open__last-itemo': 'openLast',
        'dragover': 'dragover',
        'dragleave': 'dragleave',
        'drop': 'drop'
    },

    fileData: null,
    keyFileData: null,
    passwordInput: null,
    dropboxLoading: null,

    initialize: function () {
        this.file = new FileModel();
        this.fileData = null;
        this.keyFileData = null;
        this.passwordInput = new SecureInput();
        this.listenTo(this.file, 'change:open', this.fileOpenChanged);
        this.listenTo(this.file, 'change:opening', this.fileOpeningChanged);
        this.listenTo(this.file, 'change:error', this.fileErrorChanged);
    },

    render: function () {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.renderTemplate({ supportsDropbox: !Launcher });
        this.inputEl = this.$el.find('.open__pass-input');
        this.passwordInput.setElement(this.inputEl);
        return this;
    },

    remove: function() {
        this.passwordInput.reset();
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    fileOpenChanged: function() {
        this.model.addFile(this.file);
    },

    fileOpeningChanged: function() {
        var opening = this.file.get('opening');
        this.$el.toggleClass('open--opening', opening);
        if (opening) {
            this.inputEl.attr('disabled', 'disabled');
            this.$el.find('#open__settings-check-offline').attr('disabled', 'disabled');
        } else {
            this.inputEl.removeAttr('disabled');
            this.$el.find('#open__settings-check-offline').removeAttr('disabled');
        }
    },

    fileErrorChanged: function() {
        if (this.file.get('error')) {
            this.inputEl.addClass('input--error').focus();
            this.inputEl[0].selectionStart = 0;
            this.inputEl[0].selectionEnd = this.inputEl.val().length;
        }
    },

    fileSelected: function(e) {
        var file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    },

    processFile: function(file, complete) {
        var reader = new FileReader();
        reader.onload = (function(e) {
            this[this.reading] = e.target.result;
            if (this.reading === 'fileData') {
                this.file.set('name', file.name.replace(/\.\w+$/i, ''));
                if (file.path) {
                    this.file.set({ path: file.path, storage: file.storage || 'file' });
                }
                this.displayOpenFile();
            } else {
                this.file.set('keyFileName', file.name);
                this.displayOpenKeyFile();
            }
            if (complete) {
                complete(true);
            }
        }).bind(this);
        reader.onerror = (function() {
            Alerts.error({ header: 'Failed to read file' });
            this.showReadyToOpen();
            if (complete) {
                complete(false);
            }
        }).bind(this);
        reader.readAsArrayBuffer(file);
    },

    displayOpenFile: function() {
        this.$el.addClass('open--file');
        this.$el.find('#open__settings-check-offline')[0].removeAttribute('disabled');
        this.inputEl[0].removeAttribute('readonly');
        this.inputEl[0].setAttribute('placeholder', 'Password for ' + this.file.get('name'));
        this.inputEl.focus();
    },

    displayOpenKeyFile: function() {
        this.$el.find('.open__settings-key-file-name').text(this.file.get('keyFileName'));
        this.$el.addClass('open--key-file');
        this.inputEl.focus();
    },

    setFile: function(file, keyFile) {
        this.reading = 'fileData';
        this.processFile(file, (function(success) {
            if (success && keyFile) {
                this.reading = 'keyFileData';
                this.processFile(keyFile);
            }
        }).bind(this));
    },

    createDemo: function() {
        if (!this.file.get('opening')) {
            if (!this.model.files.getByName('Demo')) {
                this.file.createDemo();
            } else {
                this.trigger('cancel');
            }
        }
    },

    createNew: function() {
        if (!this.file.get('opening')) {
            var name;
            for (var i = 0; ; i++) {
                name = 'New' + (i || '');
                if (!this.model.files.getByName(name)) {
                    break;
                }
            }
            this.file.create(name);
        }
    },

    showOpenLocalFile: function(path) {
        if (path && Launcher) {
            try {
                var name = path.match(/[^/\\]*$/)[0];
                var data = Launcher.readFile(path);
                var file = new Blob([data]);
                Object.defineProperties(file, {
                    path: { value: path },
                    name: { value: name }
                });
                this.setFile(file);
            } catch (e) {
                console.log('Failed to show local file', e);
            }
        }
    },

    openFile: function() {
        if (!this.file.get('opening')) {
            this.openAny('fileData'/*, '.kdbx'*/);
        }
    },

    openKeyFile: function(e) {
        if ($(e.target).hasClass('open__settings-key-file-dropbox')) {
            this.openKeyFileFromDropbox();
        } else if (!this.file.get('opening') && this.file.get('name')) {
            if (this.keyFileData) {
                this.keyFileData = null;
                this.file.set('keyFileName', '');
                this.$el.removeClass('open--key-file');
                this.$el.find('.open__settings-key-file-name').text('key file');
            } else {
                this.openAny('keyFileData');
            }
        }
    },

    openKeyFileFromDropbox: function() {
        if (!this.file.get('opening')) {
            DropboxLink.chooseFile((function(err, res) {
                this.keyFileData = res.data;
                this.file.set('keyFileName', res.name);
                this.displayOpenKeyFile();
            }).bind(this));
        }
    },

    openAny: function(reading, ext) {
        this.reading = reading;
        this[reading] = null;
        this.$el.find('.open__file-ctrl').attr('accept', ext || '').val(null).click();
    },

    openDb: function() {
        if (!this.file.get('opening')) {
            var arg = {
                password: this.passwordInput.value,
                fileData: this.fileData,
                keyFileData: this.keyFileData
            };
            this.file.set({opening: true, error: false});
            this.afterPaint(function () {
                this.file.open(arg.password, arg.fileData, arg.keyFileData);
            });
        }
    },

    changeOffline: function(e) {
        if (!this.file.get('opening')) {
            this.file.set('availOffline', !!e.target.checked);
        }
    },

    inputKeydown: function(e) {
        var code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN && this.passwordInput.length) {
            this.openDb();
        } else if (code === Keys.DOM_VK_CAPS_LOCK) {
            this.$el.find('.open__pass-warning').removeClass('invisible');
        }
    },

    inputKeypress: function(e) {
        var charCode = e.keyCode || e.which;
        var ch = String.fromCharCode(charCode),
            lower = ch.toLowerCase(),
            upper = ch.toUpperCase();
        if (lower !== upper && !e.shiftKey) {
            this.toggleCapsLockWarning(ch !== lower);
        }
    },

    toggleCapsLockWarning: function(on) {
        this.$el.find('.open__file-warning').toggleClass('invisible', on);
    },

    dragover: function(e) {
        e.preventDefault();
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        if (!this.$el.hasClass('open--drag')) {
            this.$el.addClass('open--drag');
        }
    },

    dragleave: function() {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.dragTimeout = setTimeout((function() {
            this.$el.removeClass('open--drag');
        }).bind(this), 100);
    },

    drop: function(e) {
        e.preventDefault();
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.$el.removeClass('open--drag');
        var files = e.target.files || e.dataTransfer.files;
        var dataFile = _.find(files, function(file) { return file.name.split('.').pop().toLowerCase() === 'kdbx'; });
        var keyFile = _.find(files, function(file) { return file.name.split('.').pop().toLowerCase() === 'key'; });
        if (dataFile) {
            this.setFile(dataFile, keyFile);
        }
    },

    openFromDropbox: function() {
        if (this.dropboxLoading) {
            return;
        }
        var that = this;
        DropboxLink.authenticate(function(err) {
            if (err) {
                return;
            }
            that.dropboxLoading = 'file list';
            that.displayDropboxLoading();
            DropboxLink.getFileList(function(err, files) {
                that.dropboxLoading = null;
                that.displayDropboxLoading();
                if (err) {
                    return;
                }
                var buttons = [];
                files.forEach(function(file) {
                    buttons.push({ result: file, title: file.replace(/\.kdbx/i, '') });
                });
                if (!buttons.length) {
                    Alerts.error({
                        header: 'Nothing found',
                        body: 'You have no files in your Dropbox which could be opened. Files are searched in your Dropbox app folder: Apps/KeeWeb'
                    });
                    return;
                }
                buttons.push({ result: '', title: 'Cancel' });
                Alerts.alert({
                    header: 'Select a file',
                    body: 'Select a file from your Dropbox which you would like to open',
                    icon: 'dropbox',
                    buttons: buttons,
                    esc: '',
                    click: '',
                    success: that.openDropboxFile.bind(that),
                    cancel: function() {
                        that.dropboxLoading = null;
                        that.displayDropboxLoading();
                    }
                });
            });
        });
    },

    openDropboxFile: function(file) {
        var fileName = file.replace(/\.kdbx/i, '');
        this.dropboxLoading = fileName;
        this.displayDropboxLoading();
        DropboxLink.openFile(file, (function(err, data) {
            this.dropboxLoading = null;
            this.displayDropboxLoading();
            if (err || !data || !data.size) {
                // TODO:render
                Alerts.error({ header: 'Failed to read file', body: 'Error reading Dropbox file: \n' + err });
                return;
            }
            Object.defineProperties(data, {
                storage: { value: 'dropbox' },
                path: { value: file },
                name: { value: fileName }
            });
            this.setFile(data);
        }).bind(this));
    },

    displayDropboxLoading: function() {
        this.$el.find('.open__icon-dropbox .open__icon-i').toggleClass('flip3d', !!this.dropboxLoading);
    }
});

module.exports = OpenView;

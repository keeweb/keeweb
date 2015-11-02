'use strict';

var Backbone = require('backbone'),
    Keys = require('../const/keys'),
    Alerts = require('../comp/alerts'),
    SecureInput = require('../comp/secure-input'),
    Launcher = require('../comp/launcher'),
    DropboxLink = require('../comp/dropbox-link');

var OpenFileView = Backbone.View.extend({
    template: require('templates/open-file.html'),

    events: {
        'click .open__file-btn-new': 'createNew',
        'click .open__file-link-open': 'openFile',
        'click .open__file-link-new': 'createNew',
        'click .open__file-link-dropbox': 'openFromDropbox',
        'click .open__file-link-demo': 'createDemo',
        'click .open__file-link-name': 'resetFile',
        'click .open__file-btn-key': 'openKeyFile',
        'click .open__file-input[readonly]': 'openFile',
        'change .open__file-ctrl': 'fileSelected',
        'input .open__file-input': 'inputInput',
        'keydown .open__file-input': 'inputKeydown',
        'keypress .open__file-input': 'inputKeypress'
    },

    fileData: null,
    keyFileData: null,
    passwordInput: null,
    dropboxLoading: null,

    initialize: function () {
        this.fileData = null;
        this.keyFileData = null;
        this.passwordInput = new SecureInput();
        this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
        this.renderTemplate($.extend({
            supportsDropbox: !Launcher,
            dropboxLoading: this.dropboxLoading
        }, this.model.attributes));
        this.inputEl = this.$el.find('.open__file-input');
        this.passwordInput.setElement(this.inputEl);
        if (this.inputEl.attr('autofocus')) {
            this.inputEl.focus();
        }
        if (this.model.get('error')) {
            this.inputEl[0].selectionStart = 0;
            this.inputEl[0].selectionEnd = this.inputEl.val().length;
        }
        return this;
    },

    openFile: function() {
        if (!this.model.get('opening')) {
            this.openAny('fileData', '.kdbx');
        }
    },

    openKeyFile: function(e) {
        if (e.target.hasAttribute('disabled')) {
            return;
        }
        if (!this.model.get('opening')) {
            if (this.keyFileData) {
                this.keyFileData = null;
                this.model.set('keyFileName', '');
            } else {
                this.openAny('keyFileData');
            }
        }
    },

    openAny: function(reading, ext) {
        this.reading = reading;
        this[reading] = null;
        this.$el.find('.open__file-ctrl').attr('accept', ext || '').click();
    },

    resetFile: function() {
        if (!this.model.get('opening')) {
            this.passwordInput.reset();
            this.fileData = null;
            this.keyfileData = null;
            this.model.clear({silent: true}).set(this.model.defaults);
        }
    },

    fileSelected: function(e) {
        this.inputEl.off('focus', this.inputFocus);
        var file = e.target.files[0];
        if (file) {
            this.displayFile(file);
        }
    },

    displayFile: function(file, complete) {
        var reader = new FileReader();
        reader.onload = (function(e) {
            this[this.reading] = e.target.result;
            if (this.reading === 'fileData') {
                this.model.set('name', file.name.replace(/\.\w+$/i, ''));
                if (file.path) {
                    this.model.set({ path: file.path, storage: file.storage || 'file' });
                }
            } else {
                this.model.set('keyFileName', file.name);
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

    setFile: function(file, keyFile) {
        this.reading = 'fileData';
        this.displayFile(file, (function(success) {
            if (success && keyFile) {
                this.reading = 'keyFileData';
                this.displayFile(keyFile);
            }
        }).bind(this));
    },

    inputKeydown: function(e) {
        var code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN && this.passwordInput.length) {
            this.openDb();
        } else if (code === Keys.DOM_VK_CAPS_LOCK) {
            this.$el.find('.open__file-warning').addClass('hide');
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
        this.$el.find('.open__file-warning').toggleClass('hide', !on);
    },

    openDb: function() {
        var arg = {
            password: this.passwordInput.value,
            fileData: this.fileData,
            keyFileData: this.keyFileData
        };
        this.model.set({ opening: true, error: false });
        this.afterPaint(function() {
            this.trigger('select', arg);
        });
    },

    createNew: function() {
        if (!this.model.get('opening')) {
            this.trigger('create');
        }
    },

    createDemo: function() {
        if (!this.model.get('opening')) {
            this.trigger('create-demo');
        }
    },

    openFromDropbox: function() {
        if (this.dropboxLoading) {
            return;
        }
        DropboxLink.authenticate((function(err) {
            if (err) {
                return;
            }
            this.dropboxLoading = 'file list';
            this.render();
            DropboxLink.getFileList((function(err, files) {
                this.dropboxLoading = null;
                if (err) {
                    this.render();
                    return;
                }
                var buttons = [];
                files.forEach(function(file) {
                    buttons.push({ result: file, title: file.replace(/\.kdbx/i, '') });
                });
                if (!buttons.length) {
                    this.dropboxLoading = null;
                    this.render();
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
                    success: this.openDropboxFile.bind(this),
                    cancel: this.cancelOpenDropboxFile.bind(this)
                });
            }).bind(this));
        }).bind(this));
    },

    openDropboxFile: function(file) {
        var fileName = file.replace(/\.kdbx/i, '');
        this.dropboxLoading = fileName;
        this.render();
        DropboxLink.openFile(file, (function(err, data) {
            this.dropboxLoading = null;
            if (err || !data || !data.size) {
                this.render();
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

    cancelOpenDropboxFile: function() {
        this.dropboxLoading = null;
        this.render();
    }
});

module.exports = OpenFileView;

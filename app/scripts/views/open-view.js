'use strict';

var Backbone = require('backbone'),
    Keys = require('../const/keys'),
    Alerts = require('../comp/alerts'),
    SecureInput = require('../comp/secure-input'),
    DropboxLink = require('../comp/dropbox-link'),
    Logger = require('../util/logger'),
    Locale = require('../util/locale');

var logger = new Logger('open-view');

var OpenView = Backbone.View.extend({
    template: require('templates/open.hbs'),

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
        'click .open__last-item': 'openLast',
        'dragover': 'dragover',
        'dragleave': 'dragleave',
        'drop': 'drop'
    },

    params: null,
    passwordInput: null,
    busy: false,

    initialize: function () {
        this.params = {
            id: null,
            name: '',
            storage: null,
            path: null,
            keyFileName: null,
            keyFileData: null,
            fileData: null,
            rev: null
        };
        this.passwordInput = new SecureInput();
    },

    render: function () {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.renderTemplate({ lastOpenFiles: this.getLastOpenFiles() });
        this.inputEl = this.$el.find('.open__pass-input');
        this.passwordInput.setElement(this.inputEl);
        return this;
    },

    getLastOpenFiles: function() {
        return this.model.fileInfos.map(function(f) {
            var icon;
            switch (f.get('storage')) {
                case 'dropbox':
                    icon = 'dropbox';
                    break;
                case 'file':
                    icon = 'hdd-o';
                    break;
                default:
                    icon = 'file-text';
                    break;
            }
            return {
                id: f.get('id'),
                name: f.get('name'),
                icon: icon
            };
        });
    },

    remove: function() {
        this.passwordInput.reset();
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    showLocalFileAlert: function() {
        if (this.model.settings.get('skipOpenLocalWarn')) {
            return;
        }
        var that = this;
        Alerts.alert({
            header: Locale.openLocalFile,
            body: Locale.openLocalFileBody,
            icon: 'file-text',
            buttons: [
                {result: 'skip', title: Locale.openLocalFileDontShow, error: true},
                {result: 'ok', title: Locale.alertOk}
            ],
            click: '',
            esc: '',
            enter: '',
            success: function(res) {
                if (res === 'skip') {
                    that.model.settings.set('skipOpenLocalWarn', true);
                }
            }
        });
    },

    fileSelected: function(e) {
        var file = e.target.files[0];
        if (file) {
            if (!file.path) {
                this.showLocalFileAlert();
            }
            this.processFile(file);
        }
    },

    processFile: function(file, complete) {
        var reader = new FileReader();
        reader.onload = (function(e) {
            if (this.reading === 'fileData') {
                this.params.id = null;
                this.params.fileData = e.target.result;
                this.params.name = file.name.replace(/\.\w+$/i, '');
                this.params.path = file.path || null;
                this.params.storage = file.path ? 'file' : null;
                this.params.rev = null;
                this.displayOpenFile();
            } else {
                this.params.keyFileData = e.target.result;
                this.params.keyFileName = file.name;
                this.displayOpenKeyFile();
            }
            if (complete) {
                complete(true);
            }
        }).bind(this);
        reader.onerror = (function() {
            Alerts.error({ header: Locale.openFailedRead });
            if (complete) {
                complete(false);
            }
        }).bind(this);
        reader.readAsArrayBuffer(file);
    },

    displayOpenFile: function() {
        this.$el.addClass('open--file');
        this.$el.find('.open__settings-key-file').removeClass('hide');
        this.inputEl[0].removeAttribute('readonly');
        this.inputEl[0].setAttribute('placeholder', Locale.openPassFor + ' ' + this.params.name);
        this.inputEl.focus();
    },

    displayOpenKeyFile: function() {
        this.$el.find('.open__settings-key-file-name').text(this.params.keyFileName);
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

    openFile: function() {
        if (!this.busy) {
            this.openAny('fileData');
        }
    },

    openKeyFile: function(e) {
        if ($(e.target).hasClass('open__settings-key-file-dropbox')) {
            this.openKeyFileFromDropbox();
        } else if (!this.busy && this.params.name) {
            if (this.params.keyFileData) {
                this.params.keyFileData = null;
                this.params.keyFileName = '';
                this.$el.removeClass('open--key-file');
                this.$el.find('.open__settings-key-file-name').text('key file');
            } else {
                this.openAny('keyFileData');
            }
        }
    },

    openKeyFileFromDropbox: function() {
        if (!this.busy) {
            DropboxLink.chooseFile((function(err, res) {
                if (err) {
                    return;
                }
                this.params.keyFileData = res.data;
                this.params.keyFileName = res.name;
                this.displayOpenKeyFile();
            }).bind(this));
        }
    },

    openAny: function(reading, ext) {
        this.reading = reading;
        this.params[reading] = null;
        this.$el.find('.open__file-ctrl').attr('accept', ext || '').val(null).click();
    },

    openLast: function(e) {
        if (this.busy) {
            return;
        }
        var id = $(e.target).closest('.open__last-item').data('id').toString();
        if ($(e.target).is('.open__last-item-icon-del')) {
            var fileInfo = this.model.fileInfos.get(id);
            if (!fileInfo.get('storage')) {
                var that = this;
                Alerts.yesno({
                    header: Locale.openRemoveLastQuestion,
                    body: Locale.openRemoveLastQuestionBody,
                    buttons: [
                        {result: 'yes', title: Locale.alertYes},
                        {result: '', title: Locale.alertNo}
                    ],
                    success: function() {
                        that.removeFile(id);
                    }
                });
                return;
            }
            this.removeFile(id);
            return;
        }
        this.showOpenFileInfo(this.model.fileInfos.get(id));
    },

    removeFile: function(id) {
        this.model.removeFileInfo(id);
        this.$el.find('.open__last-item[data-id="' + id + '"]').remove();
        this.initialize();
        this.render();
    },

    inputKeydown: function(e) {
        var code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            this.openDb();
        } else if (code === Keys.DOM_VK_CAPS_LOCK) {
            this.$el.find('.open__pass-warning').removeClass('invisible');
        } else if (code === Keys.DOM_VK_A) {
            e.stopImmediatePropagation();
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
        var files = e.target.files || e.originalEvent.dataTransfer.files;
        var dataFile = _.find(files, function(file) { return file.name.split('.').pop().toLowerCase() === 'kdbx'; });
        var keyFile = _.find(files, function(file) { return file.name.split('.').pop().toLowerCase() === 'key'; });
        if (dataFile) {
            if (!dataFile.path) {
                this.showLocalFileAlert();
            }
            this.setFile(dataFile, keyFile);
        }
    },

    displayDropboxLoading: function(isLoading) {
        this.$el.find('.open__icon-dropbox .open__icon-i').toggleClass('flip3d', !!isLoading);
    },

    openFromDropbox: function() {
        if (this.busy) {
            return;
        }
        var that = this;
        DropboxLink.authenticate(function(err) {
            if (err) {
                return;
            }
            that.busy = true;
            that.displayDropboxLoading(true);
            DropboxLink.getFileList(function(err, files, dirStat, filesStat) {
                that.busy = false;
                that.displayDropboxLoading(false);
                if (err) {
                    return;
                }
                var buttons = [];
                var allDropboxFiles = {};
                filesStat.forEach(function(file) {
                    if (!file.isFolder && !file.isRemoved) {
                        var fileName = file.name.replace(/\.kdbx/i, '');
                        buttons.push({ result: file.path, title: fileName });
                        allDropboxFiles[file.path] = file;
                    }
                });
                if (!buttons.length) {
                    Alerts.error({
                        header: Locale.openNothingFound,
                        body: Locale.openNothingFoundBody + (dirStat && dirStat.inAppFolder ? ' ' + Locale.openNothingFoundBodyAppFolder : '')
                    });
                    return;
                }
                buttons.push({ result: '', title: Locale.alertCancel });
                Alerts.alert({
                    header: Locale.openSelectFile,
                    body: Locale.openSelectFileBody,
                    icon: 'dropbox',
                    buttons: buttons,
                    esc: '',
                    click: '',
                    success: function(file) {
                        that.openDropboxFile(allDropboxFiles[file]);
                    }
                });
                that.model.fileInfos.forEach(function(fi) {
                    if (fi.get('storage') === 'dropbox' && !fi.get('modified') && !allDropboxFiles[fi.get('path')]) {
                        that.model.removeFileInfo(fi.id);
                    }
                });
            });
        });
    },

    openDropboxFile: function(fileStat) {
        if (this.busy) {
            return;
        }
        this.params.id = null;
        this.params.storage = 'dropbox';
        this.params.path = fileStat.path;
        this.params.name = fileStat.name.replace(/\.kdbx/i, '');
        this.params.rev = fileStat.versionTag;
        this.params.fileData = null;
        this.displayOpenFile();
    },

    showOpenFileInfo: function(fileInfo) {
        if (this.busy || !fileInfo) {
            return;
        }
        this.params.id = fileInfo.id;
        this.params.storage = fileInfo.get('storage');
        this.params.path = fileInfo.get('path');
        this.params.name = fileInfo.get('name');
        this.params.fileData = null;
        this.params.rev = null;
        this.displayOpenFile();
    },

    showOpenLocalFile: function(path) {
        if (this.busy) {
            return;
        }
        this.params.id = null;
        this.params.storage = 'file';
        this.params.path = path;
        this.params.name = path.match(/[^/\\]*$/)[0];
        this.params.rev = null;
        this.params.fileData = null;
        this.displayOpenFile();
    },

    createDemo: function() {
        if (!this.busy) {
            if (!this.model.createDemoFile()) {
                this.trigger('close');
            }
        }
    },

    createNew: function() {
        if (!this.busy) {
            this.model.createNewFile();
        }
    },

    openDb: function() {
        if (this.busy || !this.params.name) {
            return;
        }
        this.$el.toggleClass('open--opening', true);
        this.inputEl.attr('disabled', 'disabled');
        this.busy = true;
        this.params.password = this.passwordInput.value;
        this.afterPaint(this.model.openFile.bind(this.model, this.params, this.openDbComplete.bind(this)));
    },

    openDbComplete: function(err) {
        this.busy = false;
        this.$el.toggleClass('open--opening', false);
        this.inputEl.removeAttr('disabled').toggleClass('input--error', !!err);
        if (err) {
            logger.error('Error opening file', err);
            this.inputEl.focus();
            this.inputEl[0].selectionStart = 0;
            this.inputEl[0].selectionEnd = this.inputEl.val().length;
        } else {
            this.trigger('close');
        }
    }
});

module.exports = OpenView;

'use strict';

var Backbone = require('backbone'),
    Keys = require('../const/keys'),
    Alerts = require('../comp/alerts'),
    SecureInput = require('../comp/secure-input'),
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
            offline: false,
            availOffline: false,
            keyFileName: null,
            keyFileData: null,
            fileData: null
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
            switch (f.storage) {
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

    fileSelected: function(e) {
        var file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    },

    processFile: function(file, complete) {
        var reader = new FileReader();
        reader.onload = (function(e) {
            this.params[this.reading] = e.target.result;
            if (this.reading === 'fileData') {
                _.extend(this.params, { name: file.name.replace(/\.\w+$/i, ''), offline: false });
                if (file.path) {
                    _.extend(this.params, { path: file.path, storage: file.storage || 'file' });
                }
                this.displayOpenFile();
            } else {
                _.extend(this.params, { keyFileName: file.name });
                this.displayOpenKeyFile();
            }
            if (complete) {
                complete(true);
            }
        }).bind(this);
        reader.onerror = (function() {
            Alerts.error({ header: 'Failed to read file' });
            if (complete) {
                complete(false);
            }
        }).bind(this);
        reader.readAsArrayBuffer(file);
    },

    displayOpenFile: function() {
        this.$el.addClass('open--file');
        this.$el.find('.open__settings-key-file').removeClass('hide');
        this.$el.find('#open__settings-check-offline')[0].removeAttribute('disabled');
        var canSwitchOffline = this.params.storage !== 'file' && !this.params.offline;
        this.$el.find('.open__settings-offline').toggleClass('hide', !canSwitchOffline);
        this.$el.find('.open__settings-offline-warning').toggleClass('hide', !this.params.offline);
        this.inputEl[0].removeAttribute('readonly');
        this.inputEl[0].setAttribute('placeholder', 'Password for ' + this.params.name);
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

    showClosedFile: function(file) {
        this.params = {
            id: file.get('id'),
            name: file.get('name'),
            storage: file.get('storage'),
            path: file.get('path'),
            offline: file.get('offline'),
            availOffline: file.get('availOffline'),
            keyFileName: null,
            keyFileData: null,
            fileData: file.data
        };
        this.displayOpenFile();
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
            this.model.removeFileInfo(id);
            this.$el.find('.open__last-item[data-id="' + id + '"]').remove();
            return;
        }
        //var lastOpenFile = LastOpenFiles.byName(name);
        //switch (lastOpenFile.storage) {
        //    case 'dropbox':
        //        return this.openDropboxFile(lastOpenFile.path);
        //    case 'file':
        //        return this.showOpenLocalFile(lastOpenFile.path);
        //    default:
        //        return this.openCache(name);
        //}
    },

    inputKeydown: function(e) {
        var code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN && this.passwordInput.length) {
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
        var files = e.target.files || e.dataTransfer.files;
        var dataFile = _.find(files, function(file) { return file.name.split('.').pop().toLowerCase() === 'kdbx'; });
        var keyFile = _.find(files, function(file) { return file.name.split('.').pop().toLowerCase() === 'key'; });
        if (dataFile) {
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
            DropboxLink.getFileList(function(err, files, dirStat) {
                that.busy = false;
                that.displayDropboxLoading(false);
                if (err) {
                    return;
                }
                var buttons = [];
                var allFileNames = {};
                files.forEach(function(file) {
                    var fileName = file.replace(/\.kdbx/i, '');
                    buttons.push({ result: file, title: fileName });
                    allFileNames[fileName] = true;
                });
                if (!buttons.length) {
                    Alerts.error({
                        header: 'Nothing found',
                        body: 'You have no files in your Dropbox which could be opened.' +
                        (dirStat && dirStat.inAppFolder ? ' Files are searched inside app folder in your Dropbox.' : '')
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
                    success: that.openDropboxFile.bind(that)
                });
                that.model.fileInfos.forEach(function(fi) {
                    if (fi.get('storage') === 'dropbox' && !fi.get('modified') && !allFileNames[fi.get('name')]) {
                        that.model.removeFileInfo(fi.get('id'));
                    }
                });
            });
        });
    },

    openDropboxFile: function(file) {
        //var fileName = file.replace(/\.kdbx/i, '');
        //this.busy = true;
        //var lastOpen = LastOpenFiles.byName(fileName);
        //var errorAlertCallback = lastOpen && lastOpen.storage === 'dropbox' && lastOpen.availOffline ?
        //    this.dropboxErrorCallback.bind(this, fileName) : null;
        //DropboxLink.openFile(file, (function(err, data) {
        //    this.busy = false;
        //    if (err || !data || !data.size) {
        //        return;
        //    }
        //    Object.defineProperties(data, {
        //        storage: { value: 'dropbox' },
        //        path: { value: file },
        //        name: { value: fileName }
        //    });
        //    this.setFile(data);
        //}).bind(this), errorAlertCallback);
    },

    showOpenFileInfo: function() {
    },

    showOpenLocalFile: function(path) {
        //if (path && Launcher) {
        //    var that = this;
        //    Storage.file.load(path, function(data, err) {
        //        if (!err) {
        //            var name = path.match(/[^/\\]*$/)[0];
        //            var file = new Blob([data]);
        //            Object.defineProperties(file, {
        //                path: { value: path },
        //                name: { value: name }
        //            });
        //            that.setFile(file);
        //        }
        //    });
        //}
    },

    openCache: function(name, storage) {
        //Storage.cache.load(name, (function(data, err) {
        //    if (err) {
        //        this.delLast(name);
        //        Alerts.error({
        //            header: 'Error loading file',
        //            body: 'There was an error loading offline file ' + name + '. Please, open it from file'
        //        });
        //    } else {
        //        this.fileData = data;
        //        this.file.set({ name: name, offline: true, availOffline: true });
        //        if (storage) {
        //            this.file.set({ storage: storage });
        //        }
        //        this.displayOpenFile();
        //    }
        //}).bind(this));
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
        if (!this.busy) {
            var offlineChecked = this.$el.find('#open__settings-check-offline').is(':checked');
            this.params.availOffline = this.params.offline ||
                this.params.storage !== 'file' && offlineChecked;
            this.$el.toggleClass('open--opening', true);
            this.inputEl.attr('disabled', 'disabled');
            this.$el.find('#open__settings-check-offline').attr('disabled', 'disabled');
            this.busy = true;
            this.params.password = this.passwordInput.value;
            this.afterPaint(this.model.openFile.bind(this.model, this.params, this.openDbComplete.bind(this)));
        }
    },

    openDbComplete: function(err) {
        this.busy = false;
        this.$el.toggleClass('open--opening', false);
        this.inputEl.removeAttr('disabled').toggleClass('input--error', !!err);
        this.$el.find('#open__settings-check-offline').removeAttr('disabled');
        if (err) {
            this.inputEl.focus();
            this.inputEl[0].selectionStart = 0;
            this.inputEl[0].selectionEnd = this.inputEl.val().length;
        } else {
            this.trigger('close');
        }
    }
});

module.exports = OpenView;

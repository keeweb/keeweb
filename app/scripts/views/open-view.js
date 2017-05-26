const Backbone = require('backbone');
const kdbxweb = require('kdbxweb');
const OpenConfigView = require('./open-config-view');
const Keys = require('../const/keys');
const Alerts = require('../comp/alerts');
const SecureInput = require('../comp/secure-input');
const DropboxChooser = require('../comp/dropbox-chooser');
const KeyHandler = require('../comp/key-handler');
const StorageFileListView = require('../views/storage-file-list-view');
const FeatureDetector = require('../util/feature-detector');
const Logger = require('../util/logger');
const Locale = require('../util/locale');
const UrlUtil = require('../util/url-util');
const InputFx = require('../util/input-fx');
const Comparators = require('../util/comparators');
const Storage = require('../storage');
const Launcher = require('../comp/launcher');

const logger = new Logger('open-view');

const OpenView = Backbone.View.extend({
    template: require('templates/open.hbs'),

    events: {
        'change .open__file-ctrl': 'fileSelected',
        'click .open__icon-open': 'openFile',
        'click .open__icon-new': 'createNew',
        'click .open__icon-import-xml': 'importFromXml',
        'click .open__icon-demo': 'createDemo',
        'click .open__icon-more': 'toggleMore',
        'click .open__icon-storage': 'openStorage',
        'click .open__icon-settings': 'openSettings',
        'click .open__pass-input[readonly]': 'openFile',
        'input .open__pass-input': 'inputInput',
        'keydown .open__pass-input': 'inputKeydown',
        'keyup .open__pass-input': 'inputKeyup',
        'keypress .open__pass-input': 'inputKeypress',
        'click .open__pass-enter-btn': 'openDb',
        'click .open__settings-key-file': 'openKeyFile',
        'click .open__last-item': 'openLast',
        'dragover': 'dragover',
        'dragleave': 'dragleave',
        'drop': 'drop'
    },

    views: null,
    params: null,
    passwordInput: null,
    busy: false,
    currentSelectedIndex: -1,

    initialize: function () {
        this.views = {};
        this.params = {
            id: null,
            name: '',
            storage: null,
            path: null,
            keyFileName: null,
            keyFileData: null,
            keyFilePath: null,
            fileData: null,
            rev: null
        };
        this.passwordInput = new SecureInput();
        KeyHandler.onKey(Keys.DOM_VK_Z, this.undoKeyPress, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_TAB, this.tabKeyPress, this);
        KeyHandler.onKey(Keys.DOM_VK_ENTER, this.enterKeyPress, this);
        KeyHandler.onKey(Keys.DOM_VK_RETURN, this.enterKeyPress, this);
        KeyHandler.onKey(Keys.DOM_VK_DOWN, this.moveOpenFileSelectionDown, this);
        KeyHandler.onKey(Keys.DOM_VK_UP, this.moveOpenFileSelectionUp, this);
    },

    render: function () {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        const storageProviders = [];
        Object.keys(Storage).forEach(name => {
            const prv = Storage[name];
            if (!prv.system && prv.enabled) {
                storageProviders.push(prv);
            }
        });
        storageProviders.sort((x, y) => (x.uipos || Infinity) - (y.uipos || Infinity));
        const showMore = storageProviders.length || this.model.settings.get('canOpenSettings');
        const showLogo = !showMore && !this.model.settings.get('canOpen') && !this.model.settings.get('canCreate') &&
            !(this.model.settings.get('canOpenDemo') && !this.model.settings.get('demoOpened'));
        this.renderTemplate({
            lastOpenFiles: this.getLastOpenFiles(),
            canOpenKeyFromDropbox: !Launcher && Storage.dropbox.enabled,
            demoOpened: this.model.settings.get('demoOpened'),
            storageProviders: storageProviders,
            canOpen: this.model.settings.get('canOpen'),
            canOpenDemo: this.model.settings.get('canOpenDemo'),
            canOpenSettings: this.model.settings.get('canOpenSettings'),
            canCreate: this.model.settings.get('canCreate'),
            canImportXml: this.model.settings.get('canImportXml'),
            canRemoveLatest: this.model.settings.get('canRemoveLatest'),
            showMore: showMore,
            showLogo: showLogo
        });
        this.inputEl = this.$el.find('.open__pass-input');
        this.passwordInput.setElement(this.inputEl);
        return this;
    },

    focusInput: function() {
        if (!FeatureDetector.isMobile) {
            this.inputEl.focus();
        }
    },

    getLastOpenFiles: function() {
        return this.model.fileInfos.map(f => {
            let icon = 'file-text';
            const storage = Storage[f.get('storage')];
            if (storage && storage.icon) {
                icon = storage.icon;
            }
            if (storage && storage.iconSvg) {
                icon = null;
            }
            return {
                id: f.get('id'),
                name: f.get('name'),
                path: this.getDisplayedPath(f),
                icon: icon,
                iconSvg: storage ? storage.iconSvg : undefined
            };
        });
    },

    getDisplayedPath: function(fileInfo) {
        const storage = fileInfo.get('storage');
        if (storage === 'file' || storage === 'webdav') {
            return fileInfo.get('path');
        }
        return null;
    },

    remove: function() {
        this.passwordInput.reset();
        KeyHandler.offKey(Keys.DOM_VK_Z, this.undoKeyPress, this);
        KeyHandler.offKey(Keys.DOM_VK_TAB, this.tabKeyPress, this);
        KeyHandler.offKey(Keys.DOM_VK_ENTER, this.enterKeyPress, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterKeyPress, this);
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    showLocalFileAlert: function() {
        if (this.model.settings.get('skipOpenLocalWarn')) {
            return;
        }
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
            success: res => {
                this.focusInput();
                if (res === 'skip') {
                    this.model.settings.set('skipOpenLocalWarn', true);
                }
            }
        });
    },

    fileSelected: function(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file, success => {
                if (success && !file.path && this.reading === 'fileData') {
                    this.showLocalFileAlert();
                }
            });
        }
    },

    processFile: function(file, complete) {
        const reader = new FileReader();
        reader.onload = e => {
            let success = false;
            switch (this.reading) {
                case 'fileData':
                    if (!this.checkOpenFileFormat(e.target.result)) {
                        break;
                    }
                    this.params.id = null;
                    this.params.fileData = e.target.result;
                    this.params.name = file.name.replace(/(.+)\.\w+$/i, '$1');
                    this.params.path = file.path || null;
                    this.params.storage = file.path ? 'file' : null;
                    this.params.rev = null;
                    if (!this.params.keyFileData) {
                        this.params.keyFileName = null;
                    }
                    this.displayOpenFile();
                    this.displayOpenKeyFile();
                    success = true;
                    break;
                case 'fileXml':
                    this.params.id = null;
                    this.params.fileXml = e.target.result;
                    this.params.name = file.name.replace(/\.\w+$/i, '');
                    this.params.path = null;
                    this.params.storage = null;
                    this.params.rev = null;
                    this.importDbWithXml();
                    success = true;
                    break;
                case 'keyFileData':
                    this.params.keyFileData = e.target.result;
                    this.params.keyFileName = file.name;
                    if (this.model.settings.get('rememberKeyFiles') === 'path') {
                        this.params.keyFilePath = file.path;
                    }
                    this.displayOpenKeyFile();
                    success = true;
                    break;
            }
            if (complete) {
                complete(success);
            }
        };
        reader.onerror = () => {
            Alerts.error({ header: Locale.openFailedRead });
            if (complete) {
                complete(false);
            }
        };
        if (this.reading === 'fileXml') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    },

    checkOpenFileFormat: function(fileData) {
        const fileSig = fileData.byteLength < 8 ? null : new Uint32Array(fileData, 0, 2);
        if (!fileSig || fileSig[0] !== kdbxweb.Consts.Signatures.FileMagic) {
            Alerts.error({ header: Locale.openWrongFile, body: Locale.openWrongFileBody });
            return false;
        }
        if (fileSig[1] === kdbxweb.Consts.Signatures.Sig2Kdb) {
            Alerts.error({ header: Locale.openWrongFile, body: Locale.openKdbFileBody });
            return false;
        }
        if (fileSig[1] !== kdbxweb.Consts.Signatures.Sig2Kdbx) {
            Alerts.error({ header: Locale.openWrongFile, body: Locale.openWrongFileBody });
            return false;
        }
        return true;
    },

    displayOpenFile: function() {
        this.$el.addClass('open--file');
        this.$el.find('.open__settings-key-file').removeClass('hide');
        this.inputEl[0].removeAttribute('readonly');
        this.inputEl[0].setAttribute('placeholder', Locale.openPassFor + ' ' + this.params.name);
        this.focusInput();
    },

    displayOpenKeyFile: function() {
        this.$el.toggleClass('open--key-file', !!this.params.keyFileName);
        this.$el.find('.open__settings-key-file-name').text(this.params.keyFileName || this.params.keyFilePath || Locale.openKeyFile);
        this.focusInput();
    },

    setFile: function(file, keyFile, fileReadyCallback) {
        this.reading = 'fileData';
        this.processFile(file, success => {
            if (success && keyFile) {
                this.reading = 'keyFileData';
                this.processFile(keyFile);
            }
            if (success && typeof fileReadyCallback === 'function') {
                fileReadyCallback();
            }
        });
    },

    openFile: function() {
        if (this.model.settings.get('canOpen') === false) {
            return;
        }
        if (!this.busy) {
            this.closeConfig();
            this.openAny('fileData');
        }
    },

    importFromXml: function() {
        if (!this.busy) {
            this.closeConfig();
            this.openAny('fileXml', 'xml');
        }
    },

    openKeyFile: function(e) {
        if ($(e.target).hasClass('open__settings-key-file-dropbox')) {
            this.openKeyFileFromDropbox();
        } else if (!this.busy && this.params.name) {
            if (this.params.keyFileName) {
                this.params.keyFileData = null;
                this.params.keyFilePath = null;
                this.params.keyFileName = '';
                this.$el.removeClass('open--key-file');
                this.$el.find('.open__settings-key-file-name').text(Locale.openKeyFile);
            } else {
                this.openAny('keyFileData');
            }
        }
    },

    openKeyFileFromDropbox: function() {
        if (!this.busy) {
            new DropboxChooser((err, res) => {
                if (err) {
                    return;
                }
                this.params.keyFileData = res.data;
                this.params.keyFileName = res.name;
                this.displayOpenKeyFile();
            }).choose();
        }
    },

    openAny: function(reading, ext) {
        this.reading = reading;
        this.params[reading] = null;

        const fileInput = this.$el.find('.open__file-ctrl').attr('accept', ext || '').val(null);

        if (Launcher && Launcher.openFileChooser) {
            Launcher.openFileChooser((err, file) => {
                if (err) {
                    logger.error('Error opening file chooser', err);
                } else {
                    this.processFile(file);
                }
            });
        } else {
            fileInput.click();
        }
    },

    openLast: function(e) {
        if (this.busy) {
            return;
        }
        const id = $(e.target).closest('.open__last-item').data('id').toString();
        if ($(e.target).is('.open__last-item-icon-del')) {
            const fileInfo = this.model.fileInfos.get(id);
            if (!fileInfo.get('storage') || fileInfo.get('modified')) {
                Alerts.yesno({
                    header: Locale.openRemoveLastQuestion,
                    body: fileInfo.get('modified') ? Locale.openRemoveLastQuestionModBody : Locale.openRemoveLastQuestionBody,
                    buttons: [
                        {result: 'yes', title: Locale.alertYes},
                        {result: '', title: Locale.alertNo}
                    ],
                    success: () => {
                        this.removeFile(id);
                    }
                });
                return;
            }
            this.removeFile(id);
            return;
        }

        const fileInfo = this.model.fileInfos.get(id);
        this.showOpenFileInfo(fileInfo);
    },

    removeFile: function(id) {
        this.model.removeFileInfo(id);
        this.$el.find('.open__last-item[data-id="' + id + '"]').remove();
        this.initialize();
        this.render();
    },

    inputKeydown: function(e) {
        const code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            this.openDb();
        } else if (code === Keys.DOM_VK_CAPS_LOCK) {
            this.toggleCapsLockWarning(false);
        }
    },

    inputKeyup: function(e) {
        const code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_CAPS_LOCK) {
            this.toggleCapsLockWarning(false);
        }
    },

    inputKeypress: function(e) {
        const charCode = e.keyCode || e.which;
        const ch = String.fromCharCode(charCode);
        const lower = ch.toLowerCase();
        const upper = ch.toUpperCase();
        if (lower !== upper && !e.shiftKey) {
            this.toggleCapsLockWarning(ch !== lower);
        }
    },

    toggleCapsLockWarning: function(on) {
        this.$el.find('.open__pass-warning').toggleClass('invisible', !on);
    },

    dragover: function(e) {
        if (this.model.settings.get('canOpen') === false) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        const dt = e.originalEvent.dataTransfer;
        if (!dt.types || (dt.types.indexOf ? dt.types.indexOf('Files') === -1 : !dt.types.contains('Files'))) {
            dt.dropEffect = 'none';
            return;
        }
        dt.dropEffect = 'copy';
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        if (!this.$el.hasClass('open--drag')) {
            this.$el.addClass('open--drag');
        }
    },

    dragleave: function() {
        if (this.model.settings.get('canOpen') === false) {
            return;
        }
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.dragTimeout = setTimeout(() => {
            this.$el.removeClass('open--drag');
        }, 100);
    },

    drop: function(e) {
        if (this.model.settings.get('canOpen') === false) {
            return;
        }
        e.preventDefault();
        if (this.busy) {
            return;
        }
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.closeConfig();
        this.$el.removeClass('open--drag');
        const files = e.target.files || e.originalEvent.dataTransfer.files;
        const dataFile = _.find(files, file => file.name.split('.').pop().toLowerCase() === 'kdbx');
        const keyFile = _.find(files, file => file.name.split('.').pop().toLowerCase() === 'key');
        if (dataFile) {
            this.setFile(dataFile, keyFile,
                dataFile.path ? null : this.showLocalFileAlert.bind(this));
        }
    },

    undoKeyPress(e) {
        e.preventDefault();
    },

    tabKeyPress() {
        this.$el.addClass('open--show-focus');
    },

    enterKeyPress(e) {
        const el = this.$el.find('[tabindex]:focus');
        if (el.length) {
            el.trigger('click', e);
        }
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
        this.params.keyFileName = fileInfo.get('keyFileName');
        this.params.keyFilePath = fileInfo.get('keyFilePath');
        this.params.keyFileData = null;
        this.displayOpenFile();
        this.displayOpenKeyFile();

        this.openFileWithFingerprint(fileInfo);
    },

    showOpenLocalFile: function(path, keyFilePath) {
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
        if (keyFilePath) {
            const parsed = Launcher.parsePath(keyFilePath);
            this.params.keyFileName = parsed.file;
            this.params.keyFilePath = keyFilePath;
            this.params.keyFileData = null;
            this.displayOpenKeyFile();
        }
    },

    openFileWithFingerprint: function(fileInfo) {
        if (!fileInfo.has('fingerprint')) {
            return;
        }

        if (Launcher && Launcher.fingerprints) {
            Launcher.fingerprints.auth(fileInfo.id, fileInfo.get('fingerprint'), password => {
                this.inputEl.val(password);
                this.inputEl.trigger('input');
                this.openDb();
            });
        }
    },

    createDemo: function() {
        if (!this.busy) {
            this.closeConfig();
            if (!this.model.createDemoFile()) {
                this.trigger('close');
            }
            if (!this.model.settings.get('demoOpened')) {
                this.model.settings.set('demoOpened', true);
            }
        }
    },

    createNew: function() {
        if (!this.busy) {
            this.model.createNewFile();
        }
    },

    openDb: function() {
        if (this.params.id && this.model.files.get(this.params.id)) {
            this.trigger('close');
            return;
        }
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
            this.focusInput();
            this.inputEl[0].selectionStart = 0;
            this.inputEl[0].selectionEnd = this.inputEl.val().length;
            if (err.code === 'InvalidKey') {
                InputFx.shake(this.inputEl);
            } else {
                if (err.notFound) {
                    err = Locale.openErrorFileNotFound;
                }
                Alerts.error({
                    header: Locale.openError,
                    body: Locale.openErrorDescription + '<pre class="modal__pre">' + _.escape(err.toString()) + '</pre>'
                });
            }
        } else {
            this.trigger('close');
        }
    },

    importDbWithXml: function() {
        if (this.busy || !this.params.name) {
            return;
        }
        this.$el.toggleClass('open--opening', true);
        this.inputEl.attr('disabled', 'disabled');
        this.busy = true;
        this.afterPaint(() => this.model.importFileWithXml(this.params, err => {
            if (err) {
                this.params.name = '';
                this.params.fileXml = null;
            }
            this.openDbComplete(err);
        }));
    },

    toggleMore: function() {
        if (this.busy) {
            return;
        }
        this.closeConfig();
        this.$el.find('.open__icons--lower').toggleClass('hide');
    },

    openSettings: function() {
        Backbone.trigger('toggle-settings');
    },

    openStorage: function(e) {
        if (this.busy) {
            return;
        }
        const storage = Storage[$(e.target).closest('.open__icon').data('storage')];
        if (!storage) {
            return;
        }
        if (storage.needShowOpenConfig && storage.needShowOpenConfig()) {
            this.showConfig(storage);
        } else if (storage.list) {
            this.listStorage(storage);
        } else {
            Alerts.notImplemented();
        }
    },

    listStorage: function(storage, config) {
        if (this.busy) {
            return;
        }
        this.closeConfig();
        const icon = this.$el.find('.open__icon-storage[data-storage=' + storage.name + ']');
        this.busy = true;
        icon.toggleClass('flip3d', true);
        storage.list(config && config.dir, (err, files) => {
            icon.toggleClass('flip3d', false);
            this.busy = false;
            if (err || !files) {
                err = err ? err.toString() : '';
                if (err.lastIndexOf('OAuth', 0) !== 0 && !Alerts.alertDisplayed) {
                    Alerts.error({
                        header: Locale.openError,
                        body: Locale.openListErrorBody + '<pre class="modal__pre">' + _.escape(err.toString()) + '</pre>'
                    });
                }
                return;
            }
            if (!files.length) {
                Alerts.error({
                    header: Locale.openNothingFound,
                    body: Locale.openNothingFoundBody
                });
                return;
            }

            const fileNameComparator = Comparators.stringComparator('path', true);
            files.sort((x, y) => {
                if (x.dir !== y.dir) {
                    return !!y.dir - !!x.dir;
                }
                return fileNameComparator(x, y);
            });
            if (config && config.dir) {
                files.unshift({
                    path: config.prevDir,
                    name: '..',
                    dir: true
                });
            }
            const listView = new StorageFileListView({
                model: {
                    files,
                    showHiddenFiles: config && config.showHiddenFiles
                }
            });
            listView.on('selected', file => {
                if (file.dir) {
                    this.listStorage(storage, {
                        dir: file.path,
                        prevDir: config && config.dir || '',
                        showHiddenFiles: true
                    });
                } else {
                    this.openStorageFile(storage, file);
                }
            });
            Alerts.alert({
                header: Locale.openSelectFile,
                body: Locale.openSelectFileBody,
                icon: storage.icon || 'files-o',
                buttons: [{result: '', title: Locale.alertCancel}],
                esc: '',
                click: '',
                view: listView
            });
        });
    },

    openStorageFile: function(storage, file) {
        if (this.busy) {
            return;
        }
        this.params.id = null;
        this.params.storage = storage.name;
        this.params.path = file.path;
        this.params.name = UrlUtil.getDataFileName(file.name);
        this.params.rev = file.rev;
        this.params.fileData = null;
        this.displayOpenFile();
    },

    showConfig: function(storage) {
        if (this.busy) {
            return;
        }
        if (this.views.openConfig) {
            this.views.openConfig.remove();
        }
        const config = _.extend({
            id: storage.name,
            name: Locale[storage.name] || storage.name,
            icon: storage.icon,
            buttons: true
        }, storage.getOpenConfig());
        this.views.openConfig = new OpenConfigView({ el: this.$el.find('.open__config-wrap'), model: config }).render();
        this.views.openConfig.on('cancel', this.closeConfig.bind(this));
        this.views.openConfig.on('apply', this.applyConfig.bind(this));
        this.$el.find('.open__pass-area').addClass('hide');
        this.$el.find('.open__icons--lower').addClass('hide');
    },

    closeConfig: function() {
        if (this.busy) {
            this.storageWaitId = null;
            this.busy = false;
        }
        if (this.views.openConfig) {
            this.views.openConfig.remove();
            delete this.views.openConfig;
        }
        this.$el.find('.open__pass-area').removeClass('hide');
        this.$el.find('.open__config').addClass('hide');
        this.focusInput();
    },

    applyConfig: function(config) {
        if (this.busy || !config) {
            return;
        }
        this.busy = true;
        this.views.openConfig.setDisabled(true);
        const storage = Storage[config.storage];
        this.storageWaitId = Math.random();
        const path = config.path;
        const opts = _.omit(config, ['path', 'storage']);
        const req = {
            waitId: this.storageWaitId,
            storage: config.storage,
            path: path,
            opts: opts
        };
        if (storage.applyConfig) {
            storage.applyConfig(opts, this.storageApplyConfigComplete.bind(this, req));
        } else {
            storage.stat(path, opts, this.storageStatComplete.bind(this, req));
        }
    },

    storageApplyConfigComplete: function(req, err) {
        if (this.storageWaitId !== req.waitId) {
            return;
        }
        this.storageWaitId = null;
        this.busy = false;
        if (err) {
            this.views.openConfig.setDisabled(false);
            this.views.openConfig.setError(err);
        } else {
            this.closeConfig();
        }
    },

    storageStatComplete: function(req, err, stat) {
        if (this.storageWaitId !== req.waitId) {
            return;
        }
        this.storageWaitId = null;
        this.busy = false;
        if (err) {
            this.views.openConfig.setDisabled(false);
            this.views.openConfig.setError(err);
        } else {
            this.closeConfig();
            this.params.id = null;
            this.params.storage = req.storage;
            this.params.path = req.path;
            this.params.opts = req.opts;
            this.params.name = UrlUtil.getDataFileName(req.path);
            this.params.rev = stat.rev;
            this.params.fileData = null;
            this.displayOpenFile();
        }
    },

    moveOpenFileSelection: function(steps) {
        const lastOpenFiles = this.getLastOpenFiles();
        if (this.currentSelectedIndex + steps >= 0 &&
            this.currentSelectedIndex + steps <= lastOpenFiles.length - 1) {
            this.currentSelectedIndex = this.currentSelectedIndex + steps;
        }

        const fileInfo = this.model.fileInfos.get(lastOpenFiles[this.currentSelectedIndex].id);
        this.showOpenFileInfo(fileInfo);

        if (fileInfo && Launcher && Launcher.fingerprints) {
            this.openFileWithFingerprint(fileInfo);
        }
    },

    moveOpenFileSelectionDown: function() {
        this.moveOpenFileSelection(1);
    },

    moveOpenFileSelectionUp: function() {
        this.moveOpenFileSelection(-1);
    }
});

module.exports = OpenView;

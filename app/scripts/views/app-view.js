'use strict';

var Backbone = require('backbone'),
    DragView = require('../views/drag-view'),
    MenuView = require('../views/menu/menu-view'),
    FooterView = require('../views/footer-view'),
    ListView = require('../views/list-view'),
    ListWrapView = require('../views/list-wrap-view'),
    DetailsView = require('../views/details/details-view'),
    GrpView = require('../views/grp-view'),
    OpenView = require('../views/open-view'),
    SettingsView = require('../views/settings/settings-view'),
    Alerts = require('../comp/alerts'),
    Keys = require('../const/keys'),
    Timeouts = require('../const/timeouts'),
    KeyHandler = require('../comp/key-handler'),
    IdleTracker = require('../comp/idle-tracker'),
    Launcher = require('../comp/launcher'),
    ThemeChanger = require('../util/theme-changer'),
    UpdateModel = require('../models/update-model');

var AppView = Backbone.View.extend({
    el: 'body',

    template: require('templates/app.html'),

    events: {
        'contextmenu': 'contextmenu',
        'drop': 'drop',
        'dragover': 'dragover',
        'click a[target=_blank]': 'extLinkClick',
        'mousedown': 'bodyClick'
    },

    views: null,

    initialize: function () {
        this.views = {};
        this.views.menu = new MenuView({ model: this.model.menu });
        this.views.menuDrag = new DragView('x');
        this.views.footer = new FooterView({ model: this.model });
        this.views.listWrap = new ListWrapView({ model: this.model });
        this.views.list = new ListView({ model: this.model });
        this.views.listDrag = new DragView('x');
        this.views.list.dragView = this.views.listDrag;
        this.views.details = new DetailsView();
        this.views.details.appModel = this.model;
        this.views.grp = new GrpView();

        this.views.menu.listenDrag(this.views.menuDrag);
        this.views.list.listenDrag(this.views.listDrag);

        this.listenTo(this.model.settings, 'change:theme', this.setTheme);
        this.listenTo(this.model.files, 'update reset', this.fileListUpdated);

        this.listenTo(Backbone, 'select-all', this.selectAll);
        this.listenTo(Backbone, 'menu-select', this.menuSelect);
        this.listenTo(Backbone, 'lock-workspace', this.lockWorkspace);
        this.listenTo(Backbone, 'show-file', this.showFileSettings);
        this.listenTo(Backbone, 'open-file', this.toggleOpenFile);
        this.listenTo(Backbone, 'save-all', this.saveAll);
        this.listenTo(Backbone, 'toggle-settings', this.toggleSettings);
        this.listenTo(Backbone, 'toggle-menu', this.toggleMenu);
        this.listenTo(Backbone, 'toggle-details', this.toggleDetails);
        this.listenTo(Backbone, 'edit-group', this.editGroup);
        this.listenTo(Backbone, 'launcher-open-file', this.launcherOpenFile);
        this.listenTo(Backbone, 'user-idle', this.userIdle);
        this.listenTo(Backbone, 'app-minimized', this.appMinimized);

        this.listenTo(UpdateModel.instance, 'change:updateReady', this.updateApp);

        window.onbeforeunload = this.beforeUnload.bind(this);
        window.onresize = this.windowResize.bind(this);

        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.onKey(Keys.DOM_VK_BACK_SPACE, this.backspacePressed, this);

        setInterval(this.syncAllByTimer.bind(this), Timeouts.AutoSync);
    },

    render: function () {
        this.$el.html(this.template());
        this.setTheme();
        this.views.listWrap.setElement(this.$el.find('.app__list-wrap')).render();
        this.views.menu.setElement(this.$el.find('.app__menu')).render();
        this.views.menuDrag.setElement(this.$el.find('.app__menu-drag')).render();
        this.views.footer.setElement(this.$el.find('.app__footer')).render();
        this.views.list.setElement(this.$el.find('.app__list')).render();
        this.views.listDrag.setElement(this.$el.find('.app__list-drag')).render();
        this.views.details.setElement(this.$el.find('.app__details')).render();
        this.views.grp.setElement(this.$el.find('.app__grp')).render().hide();
        this.showLastOpenFile();
        return this;
    },

    showOpenFile: function() {
        this.views.menu.hide();
        this.views.menuDrag.hide();
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.views.grp.hide();
        this.views.footer.toggle(this.model.files.hasOpenFiles());
        this.hideSettings();
        this.hideOpenFile();
        this.views.open = new OpenView({ model: this.model });
        this.views.open.setElement(this.$el.find('.app__body')).render();
        this.views.open.on('close', this.showEntries, this);
    },

    showLastOpenFile: function() {
        this.showOpenFile();
        var lastOpenFile = this.model.fileInfos.getLast();
        if (lastOpenFile) {
            this.views.open.showOpenFileInfo(lastOpenFile);
        }
    },

    launcherOpenFile: function(path) {
        if (path && /\.kdbx$/i.test(path)) {
            this.showOpenFile();
            this.views.open.showOpenLocalFile(path);
        }
    },

    updateApp: function() {
        if (UpdateModel.instance.get('updateStatus') === 'ready' &&
            !Launcher && !this.model.files.hasOpenFiles()) {
            window.location.reload();
        }
    },

    showEntries: function() {
        this.views.menu.show();
        this.views.menuDrag.show();
        this.views.listWrap.show();
        this.views.list.show();
        this.views.listDrag.show();
        this.views.details.show();
        this.views.grp.hide();
        this.views.footer.show();
        this.hideOpenFile();
        this.hideSettings();
    },

    hideOpenFile: function() {
        if (this.views.open) {
            this.views.open.remove();
            this.views.open = null;
        }
    },

    hideSettings: function() {
        if (this.views.settings) {
            this.model.menu.setMenu('app');
            this.views.settings.remove();
            this.views.settings = null;
        }
    },

    showSettings: function(selectedMenuItem) {
        this.model.menu.setMenu('settings');
        this.views.menu.show();
        this.views.menuDrag.show();
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.views.grp.hide();
        this.hideOpenFile();
        this.views.settings = new SettingsView({ model: this.model });
        this.views.settings.setElement(this.$el.find('.app__body')).render();
        if (!selectedMenuItem) {
            selectedMenuItem = this.model.menu.generalSection.get('items').first();
        }
        this.model.menu.select({ item: selectedMenuItem });
        this.views.menu.switchVisibility(false);
    },

    showEditGroup: function() {
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.views.grp.show();
    },

    fileListUpdated: function() {
        if (this.model.files.hasOpenFiles()) {
            this.showEntries();
        } else {
            this.showOpenFile();
        }
    },

    showFileSettings: function(e) {
        var menuItem = this.model.menu.filesSection.get('items').find(function(item) {
            return item.get('file').cid === e.fileId;
        });
        if (this.views.settings) {
            if (this.views.settings.file === menuItem.get('file')) {
                this.showEntries();
            } else {
                this.model.menu.select({ item: menuItem });
            }
        } else {
            this.showSettings(menuItem);
        }
    },

    toggleOpenFile: function() {
        if (this.views.open) {
            this.showEntries();
        } else {
            this.showOpenFile();
        }
    },

    beforeUnload: function(e) {
        if (this.model.files.hasDirtyFiles()) {
            if (Launcher && !Launcher.exitRequested) {
                if (!this.exitAlertShown) {
                    var that = this;
                    that.exitAlertShown = true;
                    Alerts.yesno({
                        header: 'Unsaved changes!',
                        body: 'You have unsaved files, all changes will be lost.',
                        buttons: [{result: 'yes', title: 'Exit and discard unsaved changes'}, {result: '', title: 'Don\'t exit'}],
                        success: function () {
                            Launcher.exit();
                        },
                        cancel: function() {
                            Launcher.cancelRestart(false);
                        },
                        complete: function () {
                            that.exitAlertShown = false;
                        }
                    });
                }
                return Launcher.preventExit(e);
            }
            return 'You have unsaved files, all changes will be lost.';
        } else if (Launcher && !Launcher.exitRequested && !Launcher.restartPending &&
                Launcher.canMinimize() && this.model.settings.get('minimizeOnClose')) {
            Launcher.minimizeApp();
            return Launcher.preventExit(e);
        }
    },

    windowResize: function() {
        Backbone.trigger('page-geometry', { source: 'window' });
    },

    escPressed: function() {
        if (this.views.open && this.model.files.hasOpenFiles()) {
            this.showEntries();
        }
    },

    backspacePressed: function(e) {
        if (e.target === document.body) {
            e.preventDefault();
        }
    },

    selectAll: function() {
        this.menuSelect({ item: this.model.menu.allItemsSection.get('items').first() });
    },

    menuSelect: function(opt) {
        this.model.menu.select(opt);
        if (!this.views.grp.isHidden()) {
            this.showEntries();
        }
    },

    userIdle: function() {
        this.lockWorkspace(true);
    },

    appMinimized: function() {
        if (this.model.settings.get('lockOnMinimize')) {
            this.lockWorkspace(true);
        }
    },

    lockWorkspace: function(autoInit) {
        var that = this;
        if (Alerts.alertDisplayed) {
            return;
        }
        if (this.model.files.hasUnsavedFiles()) {
            if (this.model.settings.get('autoSave')) {
                this.saveAndLock(autoInit);
            } else {
                var message = autoInit ? 'The app cannot be locked because auto save is disabled.'
                    : 'You have unsaved changes that will be lost. Continue?';
                Alerts.alert({
                    icon: 'lock',
                    header: 'Lock',
                    body: message,
                    buttons: [
                        { result: 'save', title: 'Save changes' },
                        { result: 'discard', title: 'Discard changes', error: true },
                        { result: '', title: 'Cancel' }
                    ],
                    checkbox: 'Save changes automatically',
                    success: function(result, autoSaveChecked) {
                        if (result === 'save') {
                            if (autoSaveChecked) {
                                that.model.settings.set('autoSave', autoSaveChecked);
                            }
                            that.saveAndLock();
                        } else if (result === 'discard') {
                            that.model.closeAllFiles();
                        }
                    }
                });
            }
        } else {
            this.closeAllFilesAndShowFirst();
        }
    },

    saveAndLock: function(/*autoInit*/) {
        var pendingCallbacks = 0,
            errorFiles = [],
            that = this;
        this.model.files.forEach(function(file) {
            if (!file.get('dirty')) {
                return;
            }
            this.model.syncFile(file, null, fileSaved.bind(this, file));
            pendingCallbacks++;
        }, this);
        if (!pendingCallbacks) {
            this.closeAllFilesAndShowFirst();
        }
        function fileSaved(file, err) {
            if (err) {
                errorFiles.push(file.get('name'));
            }
            if (--pendingCallbacks === 0) {
                if (errorFiles.length && that.model.files.hasDirtyFiles()) {
                    if (!Alerts.alertDisplayed) {
                        Alerts.error({
                            header: 'Save Error',
                            body: 'Failed to auto-save file' + (errorFiles.length > 1 ? 's: ' : '') + ' ' + errorFiles.join(', ')
                        });
                    }
                } else {
                    that.closeAllFilesAndShowFirst();
                }
            }
        }
    },

    closeAllFilesAndShowFirst: function() {
        var firstFile = this.model.files.find(function(file) { return !file.get('demo') && !file.get('created'); });
        this.model.closeAllFiles();
        if (firstFile) {
            var fileInfo = this.model.fileInfos.getMatch(firstFile.get('storage'), firstFile.get('name'), firstFile.get('path'));
            if (fileInfo) {
                this.views.open.showOpenFileInfo(fileInfo);
            }
        }
    },

    saveAll: function() {
        this.model.files.forEach(function(file) {
            this.model.syncFile(file);
        }, this);
    },

    syncAllByTimer: function() {
        if (this.model.settings.get('autoSave')) {
            this.saveAll();
        }
    },

    toggleSettings: function(page) {
        var menuItem = page ? this.model.menu[page + 'Section'] : null;
        if (menuItem) {
            menuItem = menuItem.get('items').first();
        }
        if (this.views.settings) {
            if (this.views.settings.page === page || !menuItem) {
                this.showEntries();
            } else {
                if (menuItem) {
                    this.model.menu.select({item: menuItem});
                }
            }
        } else {
            this.showSettings();
            if (menuItem) {
                this.model.menu.select({item: menuItem});
            }
        }
    },

    toggleMenu: function() {
        this.views.menu.switchVisibility();
    },

    toggleDetails: function(visible) {
        this.$el.find('.app').toggleClass('app--details-visible', visible);
        this.views.menu.switchVisibility(false);
    },

    editGroup: function(group) {
        if (group && this.views.grp.isHidden()) {
            this.showEditGroup();
            this.views.grp.showGroup(group);
        } else {
            this.showEntries();
        }
    },

    contextmenu: function(e) {
        if (['input', 'textarea'].indexOf(e.target.tagName.toLowerCase()) < 0) {
            e.preventDefault();
        }
    },

    dragover: function(e) {
        e.preventDefault();
    },

    drop: function(e) {
        e.preventDefault();
    },

    setTheme: function() {
        ThemeChanger.setTheme(this.model.settings.get('theme'));
    },

    extLinkClick: function(e) {
        if (Launcher) {
            e.preventDefault();
            Launcher.openLink(e.target.href);
        }
    },

    bodyClick: function() {
        IdleTracker.regUserAction();
    }
});

module.exports = AppView;

'use strict';

var Backbone = require('backbone'),
    DragView = require('../views/drag-view'),
    MenuView = require('../views/menu/menu-view'),
    FooterView = require('../views/footer-view'),
    ListView = require('../views/list-view'),
    DetailsView = require('../views/details/details-view'),
    GrpView = require('../views/grp-view'),
    OpenView = require('../views/open-view'),
    SettingsView = require('../views/settings/settings-view'),
    Alerts = require('../comp/alerts'),
    Keys = require('../const/keys'),
    KeyHandler = require('../comp/key-handler'),
    Launcher = require('../comp/launcher'),
    ThemeChanger = require('../util/theme-changer');

var AppView = Backbone.View.extend({
    el: 'body',

    template: require('templates/app.html'),

    events: {
        'contextmenu': 'contextmenu',
        'drop': 'drop',
        'dragover': 'dragover',
        'click a[target=_blank]': 'extLinkClick'
    },

    views: null,

    initialize: function () {
        this.views = {};
        this.views.menu = new MenuView({ model: this.model.menu });
        this.views.menuDrag = new DragView('x');
        this.views.footer = new FooterView({ model: this.model });
        this.views.list = new ListView({ model: this.model });
        this.views.listDrag = new DragView('x');
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
        this.listenTo(Backbone, 'switch-view', this.switchView);
        this.listenTo(Backbone, 'toggle-settings', this.toggleSettings);
        this.listenTo(Backbone, 'toggle-menu', this.toggleMenu);
        this.listenTo(Backbone, 'toggle-details', this.toggleDetails);
        this.listenTo(Backbone, 'edit-group', this.editGroup);
        this.listenTo(Backbone, 'launcher-open-file', this.launcherOpenFile);

        window.onbeforeunload = this.beforeUnload.bind(this);
        window.onresize = this.windowResize.bind(this);

        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.onKey(Keys.DOM_VK_BACK_SPACE, this.backspacePressed, this);
    },

    render: function () {
        this.setTheme();
        this.$el.html(this.template());
        this.views.menu.setElement(this.$el.find('.app__menu')).render();
        this.views.menuDrag.setElement(this.$el.find('.app__menu-drag')).render();
        this.views.footer.setElement(this.$el.find('.app__footer')).render();
        this.views.list.setElement(this.$el.find('.app__list')).render();
        this.views.listDrag.setElement(this.$el.find('.app__list-drag')).render();
        this.views.details.setElement(this.$el.find('.app__details')).render();
        this.views.grp.setElement(this.$el.find('.app__grp')).render().hide();
        return this;
    },

    showOpenFile: function(filePath) {
        this.views.menu.hide();
        this.views.menuDrag.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.views.grp.hide();
        this.views.footer.toggle(this.model.files.hasOpenFiles());
        this.hideSettings();
        this.hideOpenFile();
        this.views.open = new OpenView({ model: this.model });
        this.views.open.setElement(this.$el.find('.app__body')).render();
        this.views.open.on('cancel', this.showEntries, this);
        if (Launcher && filePath) {
            this.views.open.showOpenLocalFile(filePath);
        }
    },

    launcherOpenFile: function(path) {
        if (path && /\.kdbx$/i.test(path)) {
            this.showOpenFile(path);
        }
    },

    showEntries: function() {
        this.views.menu.show();
        this.views.menuDrag.show();
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
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.views.grp.hide();
        this.hideOpenFile();
        this.views.settings = new SettingsView();
        this.views.settings.setElement(this.$el.find('.app__body')).render();
        if (!selectedMenuItem) {
            selectedMenuItem = this.model.menu.generalSection.get('items').first();
        }
        this.model.menu.select({ item: selectedMenuItem });
        this.views.menu.switchVisibility(false);
    },

    showEditGroup: function() {
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
        if (this.model.files.hasUnsavedFiles()) {
            if (Launcher && !Launcher.exitRequested) {
                Alerts.yesno({
                    header: 'Unsaved changes!',
                    body: 'You have unsaved files, all changes will be lost.',
                    buttons: [{result: 'yes', title: 'Exit and discard unsaved changes'}, {result: '', title: 'Don\'t exit'}],
                    success: function() {
                        Launcher.exit();
                    }
                });
                e.returnValue = false;
                return false;
            }
            return 'You have unsaved files, all changes will be lost.';
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

    lockWorkspace: function() {
        if (this.model.files.hasUnsavedFiles()) {
            Alerts.yesno({
                header: 'Unsaved changes',
                body: 'You have unsaved changes that will be lost. Continue?',
                success: this.model.closeAllFiles.bind(this.model)
            });
        } else {
            this.model.closeAllFiles();
        }
    },

    saveAll: function() {
        var fileId;
        this.model.files.forEach(function(file) {
            if (file.get('path')) {
                try {
                    file.autoSave();
                } catch (e) {
                    console.error('Failed to auto-save file', file.get('path'), e);
                    fileId = file.cid;
                }
            } else if (!fileId) {
                fileId = file.cid;
            }
        });
        if (fileId) {
            this.showFileSettings({fileId: fileId});
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

    switchView: function() {
        Alerts.notImplemented();
    },

    toggleDetails: function(visible) {
        this.$el.find('.app__list').toggleClass('app__list--details-visible', visible);
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
    }
});

module.exports = AppView;

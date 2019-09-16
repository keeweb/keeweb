import Backbone from 'backbone';
import { View } from 'view-engine/view';
import { IdleTracker } from 'comp/browser/idle-tracker';
import { KeyHandler } from 'comp/browser/key-handler';
import { Launcher } from 'comp/launcher';
import { SettingsManager } from 'comp/settings/settings-manager';
import { Alerts } from 'comp/ui/alerts';
import { Keys } from 'const/keys';
import { Timeouts } from 'const/timeouts';
import { UpdateModel } from 'models/update-model';
import { Features } from 'util/features';
import { Locale } from 'util/locale';
import { DetailsView } from 'views/details/details-view';
import { DragView } from 'views/drag-view';
import { DropdownView } from 'views/dropdown-view';
import { FooterView } from 'views/footer-view';
import { GeneratorPresetsView } from 'views/generator-presets-view';
import { GrpView } from 'views/grp-view';
import { KeyChangeView } from 'views/key-change-view';
import { ListView } from 'views/list-view';
import { ListWrapView } from 'views/list-wrap-view';
import { MenuView } from 'views/menu/menu-view';
import { OpenView } from 'views/open-view';
import { SettingsView } from 'views/settings/settings-view';
import { TagView } from 'views/tag-view';
import template from 'templates/app.hbs';

class AppView extends View {
    parent = 'body';

    template = template;

    events = {
        contextmenu: 'contextMenu',
        drop: 'drop',
        dragenter: 'dragover',
        dragover: 'dragover',
        'click a[target=_blank]': 'extLinkClick',
        mousedown: 'bodyClick'
    };

    titlebarStyle = 'default';

    constructor(model) {
        super(model);
        this.views.menu = new MenuView(this.model.menu, { ownParent: true });
        this.views.menuDrag = new DragView('x', { parent: '.app__menu-drag' });
        this.views.footer = new FooterView(this.model, { ownParent: true });
        this.views.listWrap = new ListWrapView(this.model, { ownParent: true });
        this.views.list = new ListView(this.model, { ownParent: true });
        this.views.listDrag = new DragView('x', { parent: '.app__list-drag' });
        this.views.list.dragView = this.views.listDrag;
        this.views.details = new DetailsView();
        this.views.details.appModel = this.model;

        this.views.menu.listenDrag(this.views.menuDrag);
        this.views.list.listenDrag(this.views.listDrag);

        this.titlebarStyle = this.model.settings.get('titlebarStyle');

        this.listenTo(this.model.settings, 'change:theme', this.setTheme);
        this.listenTo(this.model.settings, 'change:locale', this.setLocale);
        this.listenTo(this.model.settings, 'change:fontSize', this.setFontSize);
        this.listenTo(this.model.files, 'update reset', this.fileListUpdated);

        this.listenTo(Backbone, 'select-all', this.selectAll);
        this.listenTo(Backbone, 'menu-select', this.menuSelect);
        this.listenTo(Backbone, 'lock-workspace', this.lockWorkspace);
        this.listenTo(Backbone, 'show-file', this.showFileSettings);
        this.listenTo(Backbone, 'open-file', this.toggleOpenFile);
        this.listenTo(Backbone, 'save-all', this.saveAll);
        this.listenTo(Backbone, 'remote-key-changed', this.remoteKeyChanged);
        this.listenTo(Backbone, 'key-change-pending', this.keyChangePending);
        this.listenTo(Backbone, 'toggle-settings', this.toggleSettings);
        this.listenTo(Backbone, 'toggle-menu', this.toggleMenu);
        this.listenTo(Backbone, 'toggle-details', this.toggleDetails);
        this.listenTo(Backbone, 'edit-group', this.editGroup);
        this.listenTo(Backbone, 'edit-tag', this.editTag);
        this.listenTo(Backbone, 'edit-generator-presets', this.editGeneratorPresets);
        this.listenTo(Backbone, 'launcher-open-file', this.launcherOpenFile);
        this.listenTo(Backbone, 'user-idle', this.userIdle);
        this.listenTo(Backbone, 'os-lock', this.osLocked);
        this.listenTo(Backbone, 'power-monitor-suspend', this.osLocked);
        this.listenTo(Backbone, 'app-minimized', this.appMinimized);
        this.listenTo(Backbone, 'show-context-menu', this.showContextMenu);
        this.listenTo(Backbone, 'second-instance', this.showSingleInstanceAlert);
        this.listenTo(Backbone, 'file-modified', this.handleAutoSaveTimer);

        this.listenTo(UpdateModel.instance, 'change:updateReady', this.updateApp);

        this.listenTo(Backbone, 'enter-full-screen', this.enterFullScreen);
        this.listenTo(Backbone, 'leave-full-screen', this.leaveFullScreen);

        window.onbeforeunload = this.beforeUnload.bind(this);
        window.onresize = this.windowResize.bind(this);
        window.onblur = this.windowBlur.bind(this);

        this.onKey(Keys.DOM_VK_ESCAPE, this.escPressed);
        this.onKey(Keys.DOM_VK_BACK_SPACE, this.backspacePressed);
        if (Launcher && Launcher.devTools) {
            KeyHandler.onKey(
                Keys.DOM_VK_I,
                this.openDevTools,
                KeyHandler.SHORTCUT_ACTION + KeyHandler.SHORTCUT_OPT
            );
        }

        setInterval(this.syncAllByTimer.bind(this), Timeouts.AutoSync);

        this.setWindowClass();
        this.fixClicksInEdge();
    }

    setWindowClass() {
        const getBrowserCssClass = Features.getBrowserCssClass();
        if (getBrowserCssClass) {
            this.$el.addClass(getBrowserCssClass);
        }
        if (this.titlebarStyle !== 'default') {
            this.$el.addClass('titlebar-' + this.titlebarStyle);
        }
    }

    fixClicksInEdge() {
        // MS Edge doesn't want to handle clicks by default
        // TODO: remove once Edge 14 share drops enough
        // https://github.com/keeweb/keeweb/issues/636#issuecomment-304225634
        // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/5782378/
        if (Features.needFixClicks) {
            const msEdgeScrewer = $('<input/>')
                .appendTo(this.$el)
                .focus();
            setTimeout(() => msEdgeScrewer.remove(), 0);
        }
    }

    render() {
        super.render({
            beta: this.model.isBeta,
            titlebarStyle: this.titlebarStyle
        });
        this.panelEl = this.$el.find('.app__panel:first');
        this.views.listWrap.render();
        this.views.menu.render();
        this.views.menuDrag.render();
        this.views.footer.render();
        this.views.list.render();
        this.views.listDrag.render();
        this.views.details.setElement(this.$el.find('.app__details')).render();
        this.showLastOpenFile();
        return this;
    }

    showOpenFile() {
        this.hideContextMenu();
        this.views.menu.hide();
        this.views.menuDrag.hide();
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.views.footer.toggle(this.model.files.hasOpenFiles());
        this.hidePanelView();
        this.hideSettings();
        this.hideOpenFile();
        this.hideKeyChange();
        this.views.open = new OpenView(this.model);
        this.views.open.render();
        this.views.open.on('close', () => {
            Backbone.trigger('closed-open-view');
        });
        this.views.open.on('close', () => this.showEntries());
    }

    showLastOpenFile() {
        this.showOpenFile();
        const lastOpenFile = this.model.fileInfos.getLast();
        if (lastOpenFile) {
            this.views.open.currentSelectedIndex = 0;
            this.views.open.showOpenFileInfo(lastOpenFile);
        }
    }

    launcherOpenFile(file) {
        if (file && file.data && /\.kdbx$/i.test(file.data)) {
            this.showOpenFile();
            this.views.open.showOpenLocalFile(file.data, file.key);
        }
    }

    updateApp() {
        if (
            UpdateModel.instance.get('updateStatus') === 'ready' &&
            !Launcher &&
            !this.model.files.hasOpenFiles()
        ) {
            window.location.reload();
        }
    }

    showEntries() {
        this.views.menu.show();
        this.views.menuDrag.show();
        this.views.listWrap.show();
        this.views.list.show();
        this.views.listDrag.show();
        this.views.details.show();
        this.views.footer.show();
        this.hidePanelView();
        this.hideOpenFile();
        this.hideSettings();
        this.hideKeyChange();
    }

    hideOpenFile() {
        if (this.views.open) {
            this.views.open.remove();
            this.views.open = null;
        }
    }

    hidePanelView() {
        if (this.views.panel) {
            this.views.panel.remove();
            this.views.panel = null;
            this.panelEl.addClass('hide');
        }
    }

    showPanelView(view) {
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.hidePanelView();
        view.render();
        this.views.panel = view;
        this.panelEl.removeClass('hide');
    }

    hideSettings() {
        if (this.views.settings) {
            this.model.menu.setMenu('app');
            this.views.settings.remove();
            this.views.settings = null;
        }
    }

    hideKeyChange() {
        if (this.views.keyChange) {
            this.views.keyChange.hide();
            this.views.keyChange = null;
        }
    }

    showSettings(selectedMenuItem) {
        this.model.menu.setMenu('settings');
        this.views.menu.show();
        this.views.menuDrag.show();
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.hidePanelView();
        this.hideOpenFile();
        this.hideKeyChange();
        this.views.settings = new SettingsView({ model: this.model });
        this.views.settings.setElement(this.$el.find('.app__body')).render();
        if (!selectedMenuItem) {
            selectedMenuItem = this.model.menu.generalSection.get('items').first();
        }
        this.model.menu.select({ item: selectedMenuItem });
        this.views.menu.switchVisibility(false);
    }

    showEditGroup(group) {
        this.showPanelView(new GrpView(group));
    }

    showEditTag() {
        this.showPanelView(new TagView(this.model));
    }

    showKeyChange(file, viewConfig) {
        if (Alerts.alertDisplayed) {
            return;
        }
        if (this.views.keyChange && this.views.keyChange.model.remote) {
            return;
        }
        this.hideSettings();
        this.hidePanelView();
        this.views.menu.hide();
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.views.keyChange = new KeyChangeView({
            file,
            expired: viewConfig.expired,
            remote: viewConfig.remote
        });
        this.views.keyChange.render();
        this.views.keyChange.on('accept', this.keyChangeAccept.bind(this));
        this.views.keyChange.on('cancel', this.showEntries.bind(this));
    }

    fileListUpdated() {
        if (this.model.files.hasOpenFiles()) {
            this.showEntries();
        } else {
            this.showOpenFile();
        }
        this.fixClicksInEdge();
    }

    showFileSettings(e) {
        const menuItem = this.model.menu.filesSection
            .get('items')
            .find(item => item.get('file').cid === e.fileId);
        if (this.views.settings) {
            if (this.views.settings.file === menuItem.get('file')) {
                this.showEntries();
            } else {
                this.model.menu.select({ item: menuItem });
            }
        } else {
            this.showSettings(menuItem);
        }
    }

    toggleOpenFile() {
        if (this.views.open) {
            if (this.model.files.hasOpenFiles()) {
                this.showEntries();
            }
        } else {
            this.showOpenFile();
        }
    }

    beforeUnload(e) {
        const exitEvent = {
            preventDefault() {
                this.prevented = true;
            }
        };
        Backbone.trigger('main-window-will-close', exitEvent);
        if (exitEvent.prevented) {
            Launcher.preventExit(e);
            return;
        }
        if (this.model.files.hasDirtyFiles()) {
            const exit = () => {
                if (Launcher.canMinimize() && this.model.settings.get('minimizeOnClose')) {
                    Launcher.minimizeApp();
                } else {
                    Launcher.exit();
                }
            };
            if (Launcher && Launcher.exitRequested) {
                return;
            }
            if (Launcher) {
                if (!this.exitAlertShown) {
                    if (this.model.settings.get('autoSave')) {
                        this.saveAndLock(result => {
                            if (result) {
                                exit();
                            }
                        });
                        return Launcher.preventExit(e);
                    }
                    this.exitAlertShown = true;
                    Alerts.yesno({
                        header: Locale.appUnsavedWarn,
                        body: Locale.appUnsavedWarnBody,
                        buttons: [
                            { result: 'save', title: Locale.saveChanges },
                            { result: 'exit', title: Locale.discardChanges, error: true },
                            { result: '', title: Locale.appDontExitBtn }
                        ],
                        success: result => {
                            if (result === 'save') {
                                this.saveAndLock(result => {
                                    if (result) {
                                        exit();
                                    }
                                });
                            } else {
                                exit();
                            }
                        },
                        cancel: () => {
                            Launcher.cancelRestart(false);
                        },
                        complete: () => {
                            this.exitAlertShown = false;
                        }
                    });
                }
                return Launcher.preventExit(e);
            }
            return Locale.appUnsavedWarnBody;
        } else if (
            Launcher &&
            !Launcher.exitRequested &&
            !Launcher.restartPending &&
            Launcher.canMinimize() &&
            this.model.settings.get('minimizeOnClose')
        ) {
            Launcher.minimizeApp();
            return Launcher.preventExit(e);
        }
    }

    windowResize() {
        Backbone.trigger('page-geometry', { source: 'window' });
    }

    windowBlur(e) {
        if (e.target === window) {
            Backbone.trigger('page-blur');
        }
    }

    enterFullScreen() {
        this.$el.addClass('fullscreen');
    }

    leaveFullScreen() {
        this.$el.removeClass('fullscreen');
    }

    escPressed() {
        if (this.views.open && this.model.files.hasOpenFiles()) {
            this.showEntries();
        }
    }

    backspacePressed(e) {
        if (e.target === document.body) {
            e.preventDefault();
        }
    }

    openDevTools() {
        if (Launcher && Launcher.devTools) {
            Launcher.openDevTools();
        }
    }

    selectAll() {
        this.menuSelect({ item: this.model.menu.allItemsSection.get('items').first() });
    }

    menuSelect(opt) {
        this.model.menu.select(opt);
        if (this.views.panel && !this.views.panel.isHidden()) {
            this.showEntries();
        }
    }

    userIdle() {
        this.lockWorkspace(true);
    }

    osLocked() {
        if (this.model.settings.get('lockOnOsLock')) {
            this.lockWorkspace(true);
        }
    }

    appMinimized() {
        if (this.model.settings.get('lockOnMinimize')) {
            this.lockWorkspace(true);
        }
    }

    lockWorkspace(autoInit) {
        if (Alerts.alertDisplayed) {
            return;
        }
        if (this.model.files.hasUnsavedFiles()) {
            if (this.model.settings.get('autoSave')) {
                this.saveAndLock();
            } else {
                const message = autoInit ? Locale.appCannotLockAutoInit : Locale.appCannotLock;
                Alerts.alert({
                    icon: 'lock',
                    header: 'Lock',
                    body: message,
                    buttons: [
                        { result: 'save', title: Locale.saveChanges },
                        { result: 'discard', title: Locale.discardChanges, error: true },
                        { result: '', title: Locale.alertCancel }
                    ],
                    checkbox: Locale.appAutoSave,
                    success: (result, autoSaveChecked) => {
                        if (result === 'save') {
                            if (autoSaveChecked) {
                                this.model.settings.set('autoSave', autoSaveChecked);
                            }
                            this.saveAndLock();
                        } else if (result === 'discard') {
                            this.model.closeAllFiles();
                        }
                    }
                });
            }
        } else {
            this.closeAllFilesAndShowFirst();
        }
    }

    handleAutoSaveTimer() {
        if (this.model.settings.get('autoSaveInterval') !== 0) {
            // trigger periodical auto save
            if (this.autoSaveTimeoutId) {
                clearTimeout(this.autoSaveTimeoutId);
            }
            this.autoSaveTimeoutId = setTimeout(
                this.saveAll.bind(this),
                this.model.settings.get('autoSaveInterval') * 1000 * 60
            );
        }
    }

    saveAndLock(complete) {
        let pendingCallbacks = 0;
        const errorFiles = [];
        const that = this;
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
                        const alertBody =
                            errorFiles.length > 1
                                ? Locale.appSaveErrorBodyMul
                                : Locale.appSaveErrorBody;
                        Alerts.error({
                            header: Locale.appSaveError,
                            body: alertBody + ' ' + errorFiles.join(', ')
                        });
                    }
                    if (complete) {
                        complete(true);
                    }
                } else {
                    that.closeAllFilesAndShowFirst();
                    if (complete) {
                        complete(true);
                    }
                }
            }
        }
    }

    closeAllFilesAndShowFirst() {
        let fileToShow = this.model.files.find(file => !file.get('demo') && !file.get('created'));
        this.model.closeAllFiles();
        if (!fileToShow) {
            fileToShow = this.model.fileInfos.getLast();
        }
        if (fileToShow) {
            const fileInfo = this.model.fileInfos.getMatch(
                fileToShow.get('storage'),
                fileToShow.get('name'),
                fileToShow.get('path')
            );
            if (fileInfo) {
                this.views.open.showOpenFileInfo(fileInfo);
            }
        }
    }

    saveAll() {
        this.model.files.forEach(function(file) {
            this.model.syncFile(file);
        }, this);
    }

    syncAllByTimer() {
        if (this.model.settings.get('autoSave')) {
            this.saveAll();
        }
    }

    remoteKeyChanged(e) {
        this.showKeyChange(e.file, { remote: true });
    }

    keyChangePending(e) {
        this.showKeyChange(e.file, { expired: true });
    }

    keyChangeAccept(e) {
        this.showEntries();
        if (e.expired) {
            e.file.setPassword(e.password);
            if (e.keyFileData && e.keyFileName) {
                e.file.setKeyFile(e.keyFileData, e.keyFileName);
            } else {
                e.file.removeKeyFile();
            }
        } else {
            this.model.syncFile(e.file, {
                remoteKey: {
                    password: e.password,
                    keyFileName: e.keyFileName,
                    keyFileData: e.keyFileData
                }
            });
        }
    }

    toggleSettings(page) {
        let menuItem = page ? this.model.menu[page + 'Section'] : null;
        if (menuItem) {
            menuItem = menuItem.get('items').first();
        }
        if (this.views.settings) {
            if (this.views.settings.page === page || !menuItem) {
                if (this.model.files.hasOpenFiles()) {
                    this.showEntries();
                } else {
                    this.showLastOpenFile();
                    this.views.open.toggleMore();
                }
            } else {
                if (menuItem) {
                    this.model.menu.select({ item: menuItem });
                }
            }
        } else {
            this.showSettings();
            if (menuItem) {
                this.model.menu.select({ item: menuItem });
            }
        }
    }

    toggleMenu() {
        this.views.menu.switchVisibility();
    }

    toggleDetails(visible) {
        this.$el.find('.app').toggleClass('app--details-visible', visible);
        this.views.menu.switchVisibility(false);
    }

    editGroup(group) {
        if (group && !(this.views.panel instanceof GrpView)) {
            this.showEditGroup(group);
        } else {
            this.showEntries();
        }
    }

    editTag(tag) {
        if (tag && !(this.views.panel instanceof TagView)) {
            this.showEditTag();
            this.views.panel.showTag(tag);
        } else {
            this.showEntries();
        }
    }

    editGeneratorPresets() {
        if (!(this.views.panel instanceof GeneratorPresetsView)) {
            if (this.views.settings) {
                this.showEntries();
            }
            this.showPanelView(new GeneratorPresetsView(this.model));
        } else {
            this.showEntries();
        }
    }

    isContextMenuAllowed(e) {
        return ['input', 'textarea'].indexOf(e.target.tagName.toLowerCase()) < 0;
    }

    contextMenu(e) {
        if (this.isContextMenuAllowed(e)) {
            e.preventDefault();
        }
    }

    showContextMenu(e) {
        if (e.options && this.isContextMenuAllowed(e)) {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (this.views.contextMenu) {
                this.views.contextMenu.remove();
            }
            const menu = new DropdownView(e);
            menu.render({
                position: { left: e.pageX, top: e.pageY },
                options: e.options
            });
            menu.on('cancel', e => this.hideContextMenu());
            menu.on('select', e => this.contextMenuSelect(e));
            this.views.contextMenu = menu;
        }
    }

    hideContextMenu() {
        if (this.views.contextMenu) {
            this.views.contextMenu.remove();
            delete this.views.contextMenu;
        }
    }

    contextMenuSelect(e) {
        this.hideContextMenu();
        Backbone.trigger('context-menu-select', e);
    }

    showSingleInstanceAlert() {
        this.hideOpenFile();
        Alerts.error({
            header: Locale.appTabWarn,
            body: Locale.appTabWarnBody,
            esc: false,
            enter: false,
            click: false,
            buttons: []
        });
    }

    dragover(e) {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'none';
    }

    drop(e) {
        e.preventDefault();
    }

    setTheme() {
        SettingsManager.setTheme(this.model.settings.get('theme'));
    }

    setFontSize() {
        SettingsManager.setFontSize(this.model.settings.get('fontSize'));
    }

    setLocale() {
        SettingsManager.setLocale(this.model.settings.get('locale'));
        if (this.views.settings.isVisible()) {
            this.hideSettings();
            this.showSettings();
        }
        this.$el.find('.app__beta:first').text(Locale.appBeta);
    }

    extLinkClick(e) {
        if (Launcher) {
            e.preventDefault();
            Launcher.openLink(e.target.href);
        }
    }

    bodyClick(e) {
        IdleTracker.regUserAction();
        Backbone.trigger('click', e);
    }
}

export { AppView };

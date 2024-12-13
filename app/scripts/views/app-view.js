/* eslint-disable camelcase */
import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { IdleTracker } from 'comp/browser/idle-tracker';
import { KeyHandler } from 'comp/browser/key-handler';
import { Launcher } from 'comp/launcher';
import { SettingsManager } from 'comp/settings/settings-manager';
import { Alerts } from 'comp/ui/alerts';
import { Keys } from 'const/keys';
import { UpdateModel } from 'models/update-model';
import { Features } from 'util/features';
import { Locale } from 'util/locale';
import { Logger } from 'util/logger';
import { CsvParser } from 'util/data/csv-parser';
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
import { ImportCsvView } from 'views/import-csv-view';
import { TitlebarView } from 'views/titlebar-view';
import DOMPurify from 'DOMPurify';
import template from 'templates/app.hbs';
import wallpaper1 from 'wallpaper1';
import wallpaper2 from 'wallpaper2';
import wallpaper3 from 'wallpaper3';
import wallpaper4 from 'wallpaper4';

class AppView extends View {
    parent = 'body';
    template = template;
    titlebarStyle = 'default';
    events = {
        contextmenu: 'contextMenu',
        drop: 'drop',
        dragenter: 'dragover',
        dragover: 'dragover',
        'click a[target=_blank]': 'extLinkClick',
        mousedown: 'bodyClick'
    };

    constructor(model) {
        super(model);

        this.titlebarStyle = this.model.settings.titlebarStyle;

        this.views.menu = new MenuView(this.model.menu, { ownParent: true });
        this.views.menuDrag = new DragView('x', { parent: '.app__menu-drag' });
        this.views.footer = new FooterView(this.model, { ownParent: true });
        this.views.listWrap = new ListWrapView(this.model, { ownParent: true });
        this.views.list = new ListView(this.model, { ownParent: true });
        this.views.listDrag = new DragView('x', { parent: '.app__list-drag' });
        this.views.list.dragView = this.views.listDrag;
        this.views.details = new DetailsView(undefined, { ownParent: true });
        this.views.details.appModel = this.model;
        if (this.titlebarStyle !== 'default' && Features.renderCustomTitleBar) {
            this.views.titlebar = new TitlebarView(this.model);
        }

        this.views.menu.listenDrag(this.views.menuDrag);
        this.views.list.listenDrag(this.views.listDrag);

        this.listenTo(this.model.settings, 'change:theme', this.setTheme);
        this.listenTo(this.model.settings, 'change:locale', this.setLocale);
        this.listenTo(this.model.settings, 'change:fontSize', this.setFontSize);
        this.listenTo(this.model.settings, 'change:autoSaveInterval', this.setupAutoSave);
        this.listenTo(this.model.files, 'change', this.fileListUpdated);

        this.listenTo(Events, 'select-all', this.selectAll);
        this.listenTo(Events, 'menu-select', this.menuSelect);
        this.listenTo(Events, 'lock-workspace', this.lockWorkspace);
        this.listenTo(Events, 'open-devtools', this.openDevTools);
        this.listenTo(Events, 'show-file', this.toggleShowFile);
        this.listenTo(Events, 'open-file', this.toggleOpenFile);
        this.listenTo(Events, 'settings-file', this.showFileSettings);
        this.listenTo(Events, 'save-all', this.saveAll);
        this.listenTo(Events, 'remote-key-changed', this.remoteKeyChanged);
        this.listenTo(Events, 'key-change-pending', this.keyChangePending);
        this.listenTo(Events, 'toggle-settings', this.toggleSettings);
        this.listenTo(Events, 'toggle-menu', this.toggleMenu);
        this.listenTo(Events, 'toggle-details', this.toggleDetails);
        this.listenTo(Events, 'show-open-view', this.showOpenIfNotThere);
        this.listenTo(Events, 'edit-group', this.editGroup);
        this.listenTo(Events, 'edit-tag', this.editTag);
        this.listenTo(Events, 'edit-generator-presets', this.editGeneratorPresets);
        this.listenTo(Events, 'launcher-open-file', this.launcherOpenFile);
        this.listenTo(Events, 'user-idle', this.userIdle);
        this.listenTo(Events, 'os-lock', this.osLocked);
        this.listenTo(Events, 'power-monitor-suspend', this.osLocked);
        this.listenTo(Events, 'app-minimized', this.appMinimized);
        this.listenTo(Events, 'show-context-menu', this.showContextMenu);
        this.listenTo(Events, 'second-instance', this.showSingleInstanceAlert);
        this.listenTo(Events, 'enter-full-screen', this.enterFullScreen);
        this.listenTo(Events, 'leave-full-screen', this.leaveFullScreen);
        this.listenTo(Events, 'import-csv-requested', this.showImportCsv);
        this.listenTo(Events, 'launcher-before-quit', this.launcherBeforeQuit);
        this.listenTo(Events, 'wallpaper-change', this.wallpaperChange);
        this.listenTo(Events, 'wallpaper-opacity', this.wallpaperOpacity);
        this.listenTo(Events, 'wallpaper-toggle', this.wallpaperToggle);
        this.listenTo(UpdateModel, 'change:updateReady', this.updateApp);

        window.onbeforeunload = this.beforeUnload.bind(this);
        window.onresize = this.windowResize.bind(this);
        window.onblur = this.windowBlur.bind(this);

        this.onKey(Keys.DOM_VK_ESCAPE, this.escPressed);
        this.onKey(Keys.DOM_VK_BACK_SPACE, this.backspacePressed);
        if (Launcher && Launcher.devTools) {
            this.onKey(
                Keys.DOM_VK_I,
                this.openDevTools,
                KeyHandler.SHORTCUT_ACTION + KeyHandler.SHORTCUT_OPT,
                '*'
            );
        }

        this.setWindowClass();
        this.setupAutoSave();
    }

    setWindowClass() {
        const browserCssClass = Features.browserCssClass;
        if (browserCssClass) {
            document.body.classList.add(browserCssClass);
        }
        if (this.titlebarStyle !== 'default') {
            document.body.classList.add('titlebar-' + this.titlebarStyle);
            if (Features.renderCustomTitleBar) {
                document.body.classList.add('titlebar-custom');
            }
        }
        if (Features.isMobile) {
            document.body.classList.add('mobile');
        }
    }

    render() {
        super.render({
            beta: this.model.isBeta,
            titlebarStyle: this.titlebarStyle,
            customTitlebar: Features.renderCustomTitleBar
        });

        this.panelEl = this.$el.find('.app__panel:first');
        this.panelAppEl = this.$el.find('.app__body');
        this.panelFooterEl = this.$el.find('.app__footer');

        this.views.listWrap.render();
        this.views.menu.render();
        this.views.menuDrag.render();
        this.views.footer.render();
        this.views.list.render();
        this.views.listDrag.render();
        this.views.details.render();
        this.views.titlebar?.render();
        this.showLastOpenFile();

        Events.emit('wallpaper-change');
    }

    showOpenFile() {
        this.hideContextMenu();
        this.views.menu.hide();
        this.views.menuDrag.$el.parent().hide();
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.views.footer.toggle(this.model.files.hasOpenFiles());
        this.hidePanelView();
        this.hideSettings();
        this.hideOpenFile();
        this.hideKeyChange();
        this.hideImportCsv();
        this.views.open = new OpenView(this.model);
        this.views.open.render();
        this.views.open.on('close', () => {
            this.showEntries();
        });
    }

    showLastOpenFile() {
        this.showOpenFile();
        const lastOpenFile = this.model.fileInfos[0];
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
        if (UpdateModel.updateStatus === 'ready' && !Launcher && !this.model.files.hasOpenFiles()) {
            window.location.reload();
        }
    }

    showEntries() {
        this.views.menu.show();
        this.views.menuDrag.$el.parent().show();
        this.views.listWrap.show();
        this.views.listDrag.show();
        this.views.details.show();
        this.views.footer.show();
        this.hidePanelView();
        this.hideOpenFile();
        this.hideSettings();
        this.hideKeyChange();
        this.hideImportCsv();

        this.views.list.show();
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

    hideImportCsv() {
        if (this.views.importCsv) {
            this.views.importCsv.remove();
            this.views.importCsv = null;
        }
    }

    showSettings(selectedMenuItem) {
        this.model.menu.setMenu('settings');
        this.views.menu.show();
        this.views.menuDrag.$el.parent().show();
        this.views.listWrap.hide();
        this.views.list.hide();
        this.views.listDrag.hide();
        this.views.details.hide();
        this.hidePanelView();
        this.hideOpenFile();
        this.hideKeyChange();
        this.hideImportCsv();
        this.views.settings = new SettingsView(this.model);
        this.views.settings.render();
        if (!selectedMenuItem) {
            selectedMenuItem = this.model.menu.generalSection.items[0];
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
            this.selectLastOpenFile();
        }
    }

    /*
        @tag            v1.9.0
                        actions when switching between open vaults.
                        should be called when a new vault file is opened, which auto selects it in the footer ui.
        @event          show-file
        @arg            obj e 
                        Object { fileId: "abcdef12-1a2b-3c4d-5ef0-1a23ac802ab4" }
    */

    toggleShowFile(e) {
        new Logger('app-view').dev('<f>:toggleShowFile', '<act>:start', '<evn>:show-file');

        const file_id = e.fileId || e.file.id;

        if (!file_id) {
            new Logger('app-view').error(
                '<f>:toggleShowFile',
                '<act>:error',
                '<nsg>:could not locate invalid file id to show',
                e
            );
            Alerts.error({ header: Locale.openFailedRead, body: e.toString() });
            return;
        }

        const menuItem = this.model.menu.filesSection.items.find(
            (item) => item.file.id === file_id // 1fac5844-1693-5261-41f0-92928fcaee0a
        );

        const items = this.model.menu.filesSection.items; // match all menu vault items
        const vault_id = `${menuItem.file.id}:${menuItem.file.uuid}`;

        // action > already clicked; open file settings
        if (this.model.filter.group === vault_id) {
            this.showFileSettings(e);
            return;
        }

        // de-select all in vault menu
        this.item = this.$el.find(`.footer__db-item`);
        this.item.toggleClass('footer__center-vault-item-active', false);

        // set all menu items as inactive
        if (items) {
            items.forEach((item) => {
                item.active = false;
            });
        }

        // reset interface and select the clicked vault
        this.showEntries();
        this.model.menu.select({ item: menuItem });

        // get vault group
        this.model.filterKey = 'group';
        const filterKey = this.model.filterKey;
        const filterValue = vault_id;
        const filter = {};
        filter[filterKey] = filterValue;

        // Events.emit('menu-select', { item: menuItem });
        Events.emit('set-filter', filter);
        Events.emit('change:active', true);

        this.item = this.$el.find(`#footer__db--${menuItem.file.id}`);
        this.item.toggleClass('footer__center-vault-item-active');
    }

    /*
        File > Open Settings
        
        allows the user to modify settings specifically for the opened vault.
        change password, add/remove key, backups, clear history, etc.

        @event          settings-file
        @arg            obj e 
                        Object { fileId: "abcdef12-1a2b-3c4d-5ef0-1a23ac802ab4" }
    */

    showFileSettings(e) {
        const menuItem = this.model.menu.filesSection.items.find(
            (item) => item.file.id === e.fileId
        );
        if (this.views.settings) {
            if (this.views.settings.file === menuItem.file) {
                this.showEntries();
            } else {
                this.model.menu.select({ item: menuItem });
            }
        } else {
            this.showSettings(menuItem);
        }
    }

    /*
        File > Open

        @event          open-file
    */

    toggleOpenFile() {
        if (this.views.open) {
            if (this.model.files.hasOpenFiles()) {
                this.showEntries();
            }
        } else {
            this.showOpenFile();
        }
    }

    /*
        Launcher Before Quit

        calls main.on('before-quit').
        only utilized by MacOS.

        @event          launcher-before-quit
    */

    launcherBeforeQuit() {
        const event = {
            preventDefault() {}
        };
        const result = this.beforeUnload(event);
        if (result !== false) {
            Launcher.exit();
        }
    }

    /*
        triggered within settings. changes the opacity of the wallpaper without re-loading
        the wallpaper itself.

        @event          wallpaper-opacity
    */

    wallpaperOpacity() {
        new Logger('app-view').dev(
            '<fnc>:wallpaperOpacity',
            '<act>:start',
            '<evn>:wallpaper-opacity'
        );

        if (
            this.model.settings.backgroundPath &&
            this.model.settings.backgroundState !== 'disabled'
        ) {
            const themeScheme = SettingsManager.getThemeScheme() || 'dark';
            const bgColor =
                themeScheme === 'dark'
                    ? 'rgba(32, 32, 32, ' + this.model.settings.backgroundOpacityDark + ')'
                    : 'rgba(255, 255, 255, ' + this.model.settings.backgroundOpacityLight + ')';

            const imgPath = encodeURI(`${this.model.settings.backgroundPath}`)
                .replace(/[!'()]/g, encodeURI)
                .replace(/\*/g, '%2A');

            // sanitize for xss
            const imgCssStyle = DOMPurify.sanitize(
                'linear-gradient(' +
                    bgColor +
                    ', ' +
                    bgColor +
                    '), url(' +
                    imgPath +
                    ') 0% 0% / cover'
            );

            this.panelAppEl.css('background', imgCssStyle);
        } else {
            this.panelAppEl.css('background', '');
        }
    }

    /*
        usually triggered when the theme is changed. will see if the theme is classified as
        a dark or light theme, and then adjust the background wallpaper opacity depending on
        the choice.

        @event          wallpaper-change
    */

    wallpaperChange() {
        new Logger('app-view').dev(
            '<fnc>:wallpaperChange',
            '<act>:start',
            '<evn>:wallpaper-change'
        );

        if (this.model.settings.backgroundState !== 'disabled') {
            const wallpaperDir = Features.isDesktop ? '../../' : '';
            const wallpaperArr = [wallpaper1, wallpaper2, wallpaper3, wallpaper4];
            const wallpaperSel = wallpaperArr[Math.floor(Math.random() * wallpaperArr.length)];

            let imgPath = `${wallpaperDir}${wallpaperSel}`;

            if (
                this.model.settings.backgroundUrl &&
                this.model.settings.backgroundUrl !== '' &&
                this.model.settings.backgroundState === 'custom'
            ) {
                imgPath = encodeURI(this.model.settings.backgroundUrl)
                    .replace(/[!'()]/g, encodeURI)
                    .replace(/\*/g, '%2A');
            }

            this.model.settings.backgroundPath = imgPath;

            this.wallpaperOpacity();
        }
    }

    /*
        toggles the opacity of user wallpaper to ensure we can disable it in certain instances
        such as when viewing markdown.

        @usage          wallpaperToggle(true)       hides wallpaper
                        wallpaperToggle()           shows wallpaper
        @event          wallpaper-toggle
        @arg            bool bOff 
    */

    wallpaperToggle(bOff) {
        new Logger('app-view').dev(
            '<fnc>:wallpaperToggle',
            '<act>:start',
            '<evn>:wallpaper-toggle [' + bOff + ']'
        );

        if (
            this.model.settings.backgroundState !== 'disabled' &&
            this.model.settings.backgroundPath
        ) {
            const themeScheme = SettingsManager.getThemeScheme() || 'dark';
            const bgColor =
                themeScheme === 'dark'
                    ? 'rgba(32, 32, 32, ' +
                      (bOff === true ? 1 : this.model.settings.backgroundOpacityDark) +
                      ')'
                    : 'rgba(255, 255, 255, ' +
                      (bOff === true ? 1 : this.model.settings.backgroundOpacityLight) +
                      ')';

            const imgPath = encodeURI(`${this.model.settings.backgroundPath}`)
                .replace(/[!'()]/g, encodeURI)
                .replace(/\*/g, '%2A');

            // sanitize for xss
            const imgCssStyle = DOMPurify.sanitize(
                'linear-gradient(' +
                    bgColor +
                    ', ' +
                    bgColor +
                    '), url(' +
                    imgPath +
                    ') 0% 0% / cover'
            );

            this.panelAppEl.css('background', imgCssStyle);
        }
    }

    beforeUnload(e) {
        const exitEvent = {
            preventDefault() {
                this.prevented = true;
            }
        };
        Events.emit('main-window-will-close', exitEvent);
        if (exitEvent.prevented) {
            return Launcher ? Launcher.preventExit(e) : false;
        }

        let minimizeInsteadOfClose = this.model.settings.minimizeOnClose;
        if (Launcher?.quitOnRealQuitEventIfMinimizeOnQuitIsEnabled()) {
            minimizeInsteadOfClose = false;
        }

        if (this.model.files.hasDirtyFiles()) {
            if (Launcher) {
                const exit = () => {
                    if (minimizeInsteadOfClose) {
                        Launcher.minimizeApp();
                    } else {
                        Launcher.exit();
                    }
                };
                if (Launcher.exitRequested) {
                    return;
                }
                if (!this.exitAlertShown) {
                    if (this.model.settings.autoSave) {
                        this.saveAndLock(
                            (result) => {
                                if (result) {
                                    exit();
                                }
                            },
                            { appClosing: true }
                        );
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
                        success: (result) => {
                            if (result === 'save') {
                                this.saveAndLock(
                                    (result) => {
                                        if (result) {
                                            exit();
                                        }
                                    },
                                    { appClosing: true }
                                );
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
            minimizeInsteadOfClose
        ) {
            Launcher.minimizeApp();
            this.appMinimized();
            return Launcher.preventExit(e);
        }
    }

    windowResize() {
        Events.emit('page-geometry', { source: 'window' });
    }

    windowBlur(e) {
        if (e.target === window) {
            Events.emit('page-blur');
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
        const logger = new Logger('launcher');
        logger.info('Initializing developer console');
        if (Launcher) {
            Launcher.openDevTools();
        }
    }

    selectAll() {
        this.menuSelect({ item: this.model.menu.allItemsSection.items[0] });
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
        if (this.model.settings.lockOnOsLock) {
            this.lockWorkspace(true);
        }
    }

    appMinimized() {
        if (this.model.settings.lockOnMinimize) {
            this.lockWorkspace(true);
        }
    }

    lockWorkspace(autoInit) {
        if (Alerts.alertDisplayed) {
            return;
        }
        if (this.model.files.hasUnsavedFiles()) {
            if (this.model.settings.autoSave) {
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
                                this.model.settings.autoSave = autoSaveChecked;
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

    saveAndLock(complete, options) {
        let pendingCallbacks = 0;
        const errorFiles = [];
        this.model.files.forEach(function (file) {
            if (!file.dirty) {
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
                errorFiles.push(file.name);
            }
            if (--pendingCallbacks === 0) {
                if (errorFiles.length && this.model.files.hasDirtyFiles()) {
                    if (!Alerts.alertDisplayed) {
                        const buttons = [Alerts.buttons.ok];
                        const errorStr =
                            errorFiles.length > 1
                                ? Locale.appSaveErrorBodyMul
                                : Locale.appSaveErrorBody;
                        let body = errorStr + ' ' + errorFiles.join(', ') + '.';
                        if (options?.appClosing) {
                            buttons.unshift({
                                result: 'ignore',
                                title: Locale.appSaveErrorExitLoseChanges,
                                error: true
                            });
                            body += '\n' + Locale.appSaveErrorExitLoseChangesBody;
                        }
                        Alerts.error({
                            header: Locale.appSaveError,
                            body,
                            buttons,
                            complete: (res) => {
                                if (res === 'ignore') {
                                    this.model.closeAllFiles();
                                    if (complete) {
                                        complete(true);
                                    }
                                } else {
                                    if (complete) {
                                        complete(false);
                                    }
                                }
                            }
                        });
                    } else {
                        if (complete) {
                            complete(false);
                        }
                    }
                } else {
                    this.closeAllFilesAndShowFirst();
                    if (complete) {
                        complete(true);
                    }
                }
            }
        }
    }

    closeAllFilesAndShowFirst() {
        if (!this.model.files.hasOpenFiles()) {
            return;
        }
        let fileToShow = this.model.files.find(
            (file) => !file.demo && !file.created && !file.skipOpenList
        );
        this.model.closeAllFiles();
        if (!fileToShow) {
            fileToShow = this.model.fileInfos[0];
        }
        if (fileToShow) {
            const fileInfo = this.model.fileInfos.getMatch(
                fileToShow.storage,
                fileToShow.name,
                fileToShow.path
            );
            if (fileInfo) {
                this.views.open.showOpenFileInfo(fileInfo);
            }
        }
    }

    selectLastOpenFile() {
        const fileToShow = this.model.fileInfos[0];
        if (fileToShow) {
            this.views.open.showOpenFileInfo(fileToShow);
        }
    }

    saveAll() {
        this.model.files.forEach(function (file) {
            this.model.syncFile(file);
        }, this);
    }

    setupAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        if (this.model.settings.autoSaveInterval > 0) {
            this.autoSaveTimer = setInterval(
                this.saveAll.bind(this),
                this.model.settings.autoSaveInterval * 1000 * 60
            );
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

    toggleSettings(page, section) {
        let menuItem = page ? this.model.menu[page + 'Section'] : null;
        if (menuItem) {
            if (section) {
                menuItem = menuItem.items.find((it) => it.section === section) || menuItem.items[0];
            } else {
                menuItem = menuItem.items[0];
            }
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
                this.model.menu.select({ item: menuItem });
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
        this.$el.toggleClass('app--details-visible', visible);
        this.views.menu.switchVisibility(false);
    }

    showOpenIfNotThere() {
        if (!this.views.open) {
            this.showLastOpenFile();
        }
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
            menu.on('cancel', (e) => this.hideContextMenu());
            menu.on('select', (e) => this.contextMenuSelect(e));
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
        Events.emit('context-menu-select', e);
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
        e.dataTransfer.dropEffect = 'none';
    }

    drop(e) {
        e.preventDefault();
    }

    setTheme() {
        SettingsManager.setTheme(this.model.settings.theme);
    }

    setFontSize() {
        SettingsManager.setFontSize(this.model.settings.fontSize);
    }

    setLocale() {
        SettingsManager.setLocale(this.model.settings.locale);
        if (this.views.settings.isVisible()) {
            this.hideSettings();
            this.showSettings();
        }
        this.$el.find('.app__beta:first').text(Locale.appBeta);
    }

    extLinkClick(e) {
        if (Launcher) {
            e.preventDefault();
            const link = e.target.closest('a');
            if (link?.href) {
                Launcher.openLink(link.href);
            }
        }
    }

    bodyClick(e) {
        IdleTracker.regUserAction();
        Events.emit('click', e);
    }

    showImportCsv(file) {
        const reader = new FileReader();
        new Logger('app-view').dev('<fnc>:showImportCsv', '<act>:start', '<msg>:reading CSV file');

        reader.onload = (e) => {
            const logger = new Logger('app-view');
            logger.info('Parsing CSV...');
            const ts = logger.ts();
            const parser = new CsvParser();
            let data;
            try {
                data = parser.parse(e.target.result);
            } catch (e) {
                logger.error('Error parsing CSV', e);
                Alerts.error({ header: Locale.openFailedRead, body: e.toString() });
                return;
            }
            logger.info(`Parsed CSV: ${data.rows.length} records, ${logger.ts(ts)}`);

            // @TODO            refactor
            this.hideSettings();
            this.hidePanelView();
            this.hideOpenFile();
            this.hideKeyChange();
            this.views.menu.hide();
            this.views.listWrap.hide();
            this.views.list.hide();
            this.views.listDrag.hide();
            this.views.details.hide();

            this.views.importCsv = new ImportCsvView(data, {
                appModel: this.model,
                fileName: file.name
            });
            this.views.importCsv.render();
            this.views.importCsv.on('cancel', () => {
                if (this.model.files.hasOpenFiles()) {
                    this.showEntries();
                } else {
                    this.showOpenFile();
                }
            });
            this.views.importCsv.on('done', () => {
                this.model.refresh();
                this.showEntries();
            });
        };
        reader.onerror = () => {
            Alerts.error({ header: Locale.openFailedRead });
        };
        reader.readAsText(file);
    }
}

export { AppView };

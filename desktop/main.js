let perfTimestamps = [{ name: 'pre-init', ts: process.hrtime() }];

// @TODO: Yest
(function () {
    if (process.send && process.argv.includes('--native-module-host')) {
        require('./native-module-host').startInOwnProcess();
    }
})();

const electron = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

const { locale, setLocale, getLocaleValues } = require('./scripts/locale');
const { Logger } = require('./scripts/logger');
const { isDev } = require('./scripts/util/app-info');

perfTimestamps?.push({ name: 'loading app requires', ts: process.hrtime() });

const main = electron.app;
const logger = new Logger('remote-app');

let mainWindow = null;
let appIcon = null;
let ready = false;
let appReady = false;
let pendingUpdateFilePath;
let mainWindowPosition = {};
let updateMainWindowPositionTimeout = null;
let mainWindowMaximized = false;

const windowPositionFileName = 'window-position.json';
const portableConfigFileName = 'keeweb-portable.json';

const startupLogging =
    process.argv.some((arg) => arg.startsWith('--startup-logging')) ||
    process.env.KEEWEB_STARTUP_LOGGING === '1';

const gotTheLock = main.requestSingleInstanceLock();
if (!gotTheLock) {
    main.quit();
}

logProgress('single instance lock');

let usingPortableUserDataDir = false;
let execPath;

setUserDataPaths();

let openFile = process.argv.filter((arg) => /\.kdbx$/i.test(arg))[0];

const htmlPath =
    (isDev && process.env.KEEWEB_HTML_PATH) ||
    url.format({ protocol: 'file', slashes: true, pathname: path.join(__dirname, 'index.html') });

const showDevToolsOnStart =
    process.argv.some((arg) => arg.startsWith('--devtools')) ||
    process.env.KEEWEB_OPEN_DEVTOOLS === '1';

const loginItemSettings = process.platform === 'darwin' ? main.getLoginItemSettings() : {};

const startMinimized =
    loginItemSettings.wasOpenedAsHidden ||
    process.argv.some((arg) => arg.startsWith('--minimized'));

const themeBgColors = {
    dark: '#1e1e1e',
    light: '#f6f6f6',
    db: '#342f2e',
    fb: '#282c34',
    wh: '#fafafa',
    te: '#222',
    hc: '#fafafa',
    sd: '#002b36',
    sl: '#fdf6e3'
};
const darkLightThemes = {
    dark: 'light',
    sd: 'sl',
    fb: 'bl',
    db: 'lb',
    te: 'lt',
    dc: 'hc'
};
const defaultBgColor = '#282C34';

logProgress('defining args');

setEnv();
setDevAppIcon();

let configEncryptionKey;
let appSettings;

const settingsPromise = loadSettingsEncryptionKey().then((key) => {
    configEncryptionKey = key;
    logProgress('loading settings key');

    return loadConfig('app-settings').then((settings) => {
        try {
            appSettings = settings ? JSON.parse(settings) : {};
        } catch (e) {
            logStartupMessage(`Error loading app settings: ${e}`);
        }
        logProgress('reading app settings');
    });
});

main.on('window-all-closed', () => {
    if (pendingUpdateFilePath) {
        exitAndStartUpdate();
    } else {
        if (process.platform !== 'darwin') {
            main.quit();
        }
    }
});
main.on('ready', () => {
    logProgress('app on ready');
    appReady = true;

    settingsPromise
        .then(() => {
            createMainWindow();
            setupIpcHandlers();
            setGlobalShortcuts(appSettings);
            subscribePowerEvents();
            hookRequestHeaders();

            loadLocale().then(() => {
                setMenu();
            });
        })
        .catch((e) => {
            electron.dialog.showErrorBox('KeeWeb', 'Error loading app: ' + e);
            main.exit(2);
        });
});
main.on('open-file', (e, path) => {
    e.preventDefault();
    openFile = path;
    notifyOpenFile();
});
main.on('activate', () => {
    if (process.platform === 'darwin') {
        if (appReady && !mainWindow && appSettings) {
            createMainWindow();
        } else if (appIcon) {
            restoreMainWindow();
        }
    }
});
main.on('before-quit', (e) => {
    if (main.hookBeforeQuitEvent && mainWindow) {
        e.preventDefault();
        emitRemoteEvent('launcher-before-quit');
    }
});
main.on('will-quit', () => {
    electron.globalShortcut.unregisterAll();
});
main.on('second-instance', () => {
    if (mainWindow) {
        restoreMainWindow();
    }
});
main.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler((e) => {
        logger.warn(`Prevented new window: ${e.url}`);
        emitRemoteEvent('log', `Prevented new window: ${e.url}`);
        return { action: 'deny' };
    });
    contents.on('will-navigate', (e, url) => {
        if (!url.startsWith('https://beta.keeweb.info/') && !url.startsWith(htmlPath)) {
            e.preventDefault();
            logger.warn(`Prevented navigation: ${url}`);
        }
    });
});
main.restartAndUpdate = function (updateFilePath) {
    pendingUpdateFilePath = updateFilePath;
    mainWindow.close();
    setTimeout(() => {
        pendingUpdateFilePath = undefined;
    }, 1000);
};
main.minimizeApp = function (menuItemLabels) {
    let imagePath;
    // a workaround to correctly restore focus on windows platform
    // without this workaround, focus is not restored to the previously focused field
    if (process.platform === 'win32') {
        mainWindow.minimize();
    }
    mainWindow.hide();
    if (process.platform === 'darwin') {
        main.dock.hide();
        imagePath = 'macOS-MenubarTemplate.png';
    } else {
        imagePath = 'icon.png';
    }
    mainWindow.setSkipTaskbar(true);
    if (!appIcon) {
        const image = electron.nativeImage.createFromPath(path.join(__dirname, 'img', imagePath));
        appIcon = new electron.Tray(image);
        if (process.platform !== 'darwin') {
            appIcon.on('click', restoreMainWindow);
        }
        const contextMenu = electron.Menu.buildFromTemplate([
            { label: menuItemLabels.restore, click: restoreMainWindow },
            { label: menuItemLabels.quit, click: closeMainWindow }
        ]);
        appIcon.setContextMenu(contextMenu);
        appIcon.setToolTip('KeeWeb');
    }
};
main.minimizeThenHideIfInTray = function () {
    // This function is called when auto-type has displayed a selection list and a selection was made.
    // To ensure focus returns to the previous window we must minimize first even if we're going to hide.
    mainWindow.minimize();

    if (appIcon) {
        mainWindow.hide();
    }
};
main.getMainWindow = function () {
    return mainWindow;
};
main.setHookBeforeQuitEvent = (hooked) => {
    main.hookBeforeQuitEvent = !!hooked;
};
main.setGlobalShortcuts = setGlobalShortcuts;
main.showAndFocusMainWindow = showAndFocusMainWindow;
main.loadConfig = loadConfig;
main.saveConfig = saveConfig;
main.getAppMainRoot = getAppMainRoot;
main.getAppContentRoot = getAppContentRoot;
main.httpRequestQuery = httpRequestQuery;

function logProgress(name) {
    perfTimestamps?.push({ name, ts: process.hrtime() });
    logStartupMessage(name);
}

function logStartupMessage(msg) {
    if (startupLogging) {
        // eslint-disable-next-line no-console
        console.log('[startup]', msg);
    }
}

function checkSettingsTheme(theme) {
    // old settings migration
    if (theme === 'macdark') {
        return 'dark';
    }
    if (theme === 'wh') {
        return 'light';
    }
    return theme;
}

function getDefaultTheme() {
    return 'dark';
}

function selectDarkOrLightTheme(theme) {
    const dark = electron.nativeTheme.shouldUseDarkColors;
    for (const [darkTheme, lightTheme] of Object.entries(darkLightThemes)) {
        if (darkTheme === theme || lightTheme === theme) {
            return dark ? darkTheme : lightTheme;
        }
    }
    return theme;
}

function createMainWindow() {
    let theme = checkSettingsTheme(appSettings.theme) || getDefaultTheme();
    if (appSettings.autoSwitchTheme) {
        theme = selectDarkOrLightTheme(theme);
    }

    const bgColor = themeBgColors[theme] || defaultBgColor;
    const isWindows = process.platform === 'win32';

    let titlebarStyle = appSettings.titlebarStyle;
    if (titlebarStyle === 'hidden-inset') {
        titlebarStyle = 'hiddenInset';
    }

    const frameless = isWindows && ['hidden', 'hiddenInset'].includes(titlebarStyle);

    const windowOptions = {
        show: false,
        width: 1000,
        height: 700,
        minWidth: 700,
        minHeight: 400,
        titleBarStyle: titlebarStyle,
        frame: !frameless,
        backgroundColor: bgColor,
        webPreferences: {
            contextIsolation: false,
            backgroundThrottling: false,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            enableRemoteModule: true,
            spellcheck: false,
            v8CacheOptions: 'none'
        }
    };

    if (process.platform !== 'win32') {
        windowOptions.icon = path.join(__dirname, 'img', 'icon.png');
    }

    mainWindow = new electron.BrowserWindow(windowOptions);
    mainWindow.webContents.openDevTools();
    logProgress('creating main window');

    mainWindow.loadURL(htmlPath);
    mainWindow.once('ready-to-show', () => {
        logProgress('main window ready');
        if (startMinimized) {
            emitRemoteEvent('launcher-started-minimized');
        } else {
            mainWindow.show();
        }
        ready = true;
        notifyOpenFile();
        logProgress('main window shown');
        reportStartProfile();

        if (showDevToolsOnStart) {
            mainWindow.webContents.openDevTools({ mode: 'bottom' });
        }
    });

    mainWindow.webContents.on('context-menu', onContextMenu);
    mainWindow.on('resize', delaySaveMainWindowPosition);
    mainWindow.on('move', delaySaveMainWindowPosition);
    mainWindow.on('restore', coerceMainWindowPositionToConnectedDisplay);
    mainWindow.on('close', mainWindowClosing);
    mainWindow.on('closed', mainWindowClosed);
    mainWindow.on('focus', mainWindowFocus);
    mainWindow.on('blur', mainWindowBlur);
    mainWindow.on('closed', () => {
        mainWindow = null;
        saveMainWindowPosition();
    });

    mainWindow.on('minimize', () => {
        emitRemoteEvent('launcher-minimize');
    });

    mainWindow.on('maximize', () => {
        mainWindowMaximized = true;
        emitRemoteEvent('launcher-maximize');
    });

    mainWindow.on('unmaximize', () => {
        mainWindowMaximized = false;
        emitRemoteEvent('launcher-unmaximize');
    });

    mainWindow.on('leave-full-screen', () => {
        emitRemoteEvent('leave-full-screen');
    });

    mainWindow.on('enter-full-screen', () => {
        emitRemoteEvent('enter-full-screen');
    });

    mainWindow.on('session-end', () => {
        emitRemoteEvent('os-lock');
    });

    logProgress('configuring main window');

    restoreMainWindowPosition();
    logProgress('restoring main window position');
}

function restoreMainWindow() {
    if (process.platform === 'darwin' && !main.dock.isVisible()) {
        main.dock.show();
    }

    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }

    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    coerceMainWindowPositionToConnectedDisplay();
    setTimeout(destroyAppIcon, 0);
}

function showAndFocusMainWindow() {
    if (appIcon) {
        restoreMainWindow();
    }

    if (mainWindowMaximized) {
        mainWindow.maximize();
    } else {
        mainWindow.show();
    }

    mainWindow.focus();
    if (process.platform === 'darwin' && !main.dock.isVisible()) {
        main.dock.show();
    }
}

function closeMainWindow() {
    emitRemoteEvent('launcher-exit-request');
    setTimeout(destroyAppIcon, 0);
}

function destroyAppIcon() {
    if (appIcon) {
        appIcon.destroy();
        appIcon = null;
    }
}

function delaySaveMainWindowPosition() {
    if (updateMainWindowPositionTimeout) {
        clearTimeout(updateMainWindowPositionTimeout);
    }

    updateMainWindowPositionTimeout = setTimeout(updateMainWindowPosition, 500);
}

function updateMainWindowPositionIfPending() {
    if (updateMainWindowPositionTimeout) {
        clearTimeout(updateMainWindowPositionTimeout);
        updateMainWindowPosition();
    }
}

function updateMainWindowPosition() {
    if (!mainWindow) {
        return;
    }

    updateMainWindowPositionTimeout = null;
    const bounds = mainWindow.getBounds();
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized() && !mainWindow.isFullScreen()) {
        mainWindowPosition.x = bounds.x;
        mainWindowPosition.y = bounds.y;
        mainWindowPosition.width = bounds.width;
        mainWindowPosition.height = bounds.height;
    }

    mainWindowPosition.maximized = mainWindow.isMaximized();
    mainWindowPosition.fullScreen = mainWindow.isFullScreen();
    mainWindowPosition.changed = true;
}

function saveMainWindowPosition() {
    if (!mainWindowPosition.changed) {
        return;
    }

    delete mainWindowPosition.changed;

    try {
        fs.writeFileSync(
            path.join(main.getPath('userData'), windowPositionFileName),
            JSON.stringify(mainWindowPosition),
            'utf8'
        );
    } catch (e) {}
}

function restoreMainWindowPosition() {
    const fileName = path.join(main.getPath('userData'), windowPositionFileName);
    fs.readFile(fileName, 'utf8', (e, data) => {
        if (data) {
            try {
                mainWindowPosition = JSON.parse(data);
            } catch (e) {
                logStartupMessage(`Error loading main window position: ${e}`);
            }
            if (mainWindow && mainWindowPosition) {
                if (mainWindowPosition.width && mainWindowPosition.height) {
                    mainWindow.setBounds(mainWindowPosition);
                    coerceMainWindowPositionToConnectedDisplay();
                }
                if (mainWindowPosition.maximized) {
                    mainWindow.maximize();
                    mainWindowMaximized = true;
                }
                if (mainWindowPosition.fullScreen) {
                    mainWindow.setFullScreen(true);
                }
            }
        }
    });
}

function mainWindowBlur() {
    emitRemoteEvent('main-window-blur');
}

function mainWindowFocus() {
    emitRemoteEvent('main-window-focus');
}

function mainWindowClosing() {
    updateMainWindowPositionIfPending();
}

function mainWindowClosed() {
    main.removeAllListeners('remote-app-event');
}

function emitRemoteEvent(e, arg) {
    if (mainWindow && mainWindow.webContents) {
        main.emit('remote-app-event', {
            name: e,
            data: arg
        });
    }
}

function setMenu() {
    if (process.platform === 'darwin') {
        const name = require('electron').app.name;
        const template = [
            {
                label: name,
                submenu: [
                    { role: 'about', label: locale.sysMenuAboutKeeWeb?.replace('{}', 'KeeWeb') },
                    { type: 'separator' },
                    { role: 'services', submenu: [], label: locale.sysMenuServices },
                    { type: 'separator' },
                    {
                        accelerator: 'Command+H',
                        role: 'hide',
                        label: locale.sysMenuHide?.replace('{}', 'KeeWeb')
                    },
                    {
                        accelerator: 'Command+Shift+H',
                        role: 'hideothers',
                        label: locale.sysMenuHideOthers
                    },
                    { role: 'unhide', label: locale.sysMenuUnhide },
                    { type: 'separator' },
                    {
                        role: 'quit',
                        accelerator: 'Command+Q',
                        label: locale.sysMenuQuit?.replace('{}', 'KeeWeb')
                    }
                ]
            },
            {
                label: locale.sysMenuEdit || 'Edit',
                submenu: [
                    { accelerator: 'CmdOrCtrl+Z', role: 'undo', label: locale.sysMenuUndo },
                    { accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo', label: locale.sysMenuRedo },
                    { type: 'separator' },
                    { accelerator: 'CmdOrCtrl+X', role: 'cut', label: locale.sysMenuCut },
                    { accelerator: 'CmdOrCtrl+C', role: 'copy', label: locale.sysMenuCopy },
                    { accelerator: 'CmdOrCtrl+V', role: 'paste', label: locale.sysMenuPaste },
                    {
                        accelerator: 'CmdOrCtrl+A',
                        role: 'selectall',
                        label: locale.sysMenuSelectAll
                    }
                ]
            },
            {
                label: locale.sysMenuWindow || 'Window',
                submenu: [
                    { accelerator: 'CmdOrCtrl+M', role: 'minimize', label: locale.sysMenuMinimize },
                    { accelerator: 'Command+W', role: 'close', label: locale.sysMenuClose }
                ]
            }
        ];
        const menu = electron.Menu.buildFromTemplate(template);
        electron.Menu.setApplicationMenu(menu);
    } else {
        mainWindow.setMenuBarVisibility(false);
        mainWindow.setMenu(null);
        electron.Menu.setApplicationMenu(null);
    }
}

function onContextMenu(e, props) {
    if (props.inputFieldType !== 'plainText' || !props.isEditable) {
        return;
    }

    const Menu = electron.Menu;
    const inputMenu = Menu.buildFromTemplate([
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectall' }
    ]);

    inputMenu.popup(mainWindow);
}

function notifyOpenFile() {
    if (ready && openFile && mainWindow) {
        const openKeyfile = process.argv
            .filter((arg) => arg.startsWith('--keyfile='))
            .map((arg) => arg.replace('--keyfile=', ''))[0];
        const fileInfo = JSON.stringify({ data: openFile, key: openKeyfile });
        mainWindow.webContents.executeJavaScript(
            'if (window.launcherOpen) { window.launcherOpen(' +
                fileInfo +
                '); } ' +
                ' else { window.launcherOpenedFile=' +
                fileInfo +
                '; }'
        );
        openFile = null;
    }
}

function setGlobalShortcuts(appSettings) {
    const defaultShortcutModifiers = process.platform === 'darwin' ? 'Ctrl+Alt+' : 'Shift+Alt+';
    const defaultShortcuts = {
        AutoType: { shortcut: defaultShortcutModifiers + 'T', event: 'auto-type' },
        CopyPassword: { shortcut: defaultShortcutModifiers + 'C', event: 'copy-password' },
        CopyUser: { shortcut: defaultShortcutModifiers + 'B', event: 'copy-user' },
        CopyUrl: { shortcut: defaultShortcutModifiers + 'U', event: 'copy-url' },
        CopyOtp: { event: 'copy-otp' },
        RestoreApp: { action: restoreMainWindow }
    };

    electron.globalShortcut.unregisterAll();

    for (const [key, shortcutDef] of Object.entries(defaultShortcuts)) {
        const fromSettings = appSettings[`globalShortcut${key}`];
        const shortcut = fromSettings || shortcutDef.shortcut;
        if (shortcut) {
            try {
                electron.globalShortcut.register(shortcut, () => {
                    if (shortcutDef.event) {
                        emitRemoteEvent(shortcutDef.event);
                    }
                    if (shortcutDef.action) {
                        shortcutDef.action();
                    }
                });
            } catch (e) {}
        }
    }

    logProgress('setting global shortcuts');
}

function subscribePowerEvents() {
    electron.powerMonitor.on('suspend', () => {
        emitRemoteEvent('power-monitor-suspend');
    });

    electron.powerMonitor.on('resume', () => {
        emitRemoteEvent('power-monitor-resume');
    });

    electron.powerMonitor.on('lock-screen', () => {
        emitRemoteEvent('os-lock');
    });

    logProgress('subscribing to power events');
}

function setUserDataPaths() {
    execPath = process.execPath;

    let isPortable = false;

    switch (process.platform) {
        case 'darwin':
            isPortable = !execPath.includes('/Applications/');
            if (isPortable) {
                execPath = execPath.substring(0, execPath.indexOf('.app'));
            }
            break;
        case 'win32':
            isPortable = !execPath.includes('Program Files');
            break;
        case 'linux':
            isPortable = !execPath.startsWith('/usr/') && !execPath.startsWith('/opt/');
            break;
    }

    if (isDev && process.env.KEEWEB_IS_PORTABLE) {
        try {
            isPortable = !!JSON.parse(process.env.KEEWEB_IS_PORTABLE);
        } catch {}
    }

    logProgress('portable check');

    if (isPortable) {
        const portableConfigDir = path.dirname(execPath);
        const portableConfigPath = path.join(portableConfigDir, portableConfigFileName);

        if (fs.existsSync(portableConfigPath)) {
            try {
                const portableConfig = JSON.parse(fs.readFileSync(portableConfigPath, 'utf8'));
                const portableUserDataDir = path.resolve(
                    portableConfigDir,
                    portableConfig.userDataDir
                );

                if (!fs.existsSync(portableUserDataDir)) {
                    fs.mkdirSync(portableUserDataDir, { recursive: true });
                }

                main.setPath('userData', portableUserDataDir);
                usingPortableUserDataDir = true;
            } catch (e) {
                logStartupMessage(`Error loading portable config: ${e}`);
            }
        }
    }

    logProgress('userdata dir');
}

function setEnv() {
    if (
        process.platform === 'linux' &&
        ['Pantheon', 'Unity:Unity7'].indexOf(process.env.XDG_CURRENT_DESKTOP) !== -1
    ) {
        // https://github.com/electron/electron/issues/9046
        process.env.XDG_CURRENT_DESKTOP = 'Unity';
    }

    main.commandLine.appendSwitch('disable-background-timer-throttling');

    // disable all caching, since we're not using old profile data anyway
    main.commandLine.appendSwitch('disable-http-cache');
    main.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

    if (process.platform === 'linux') {
        // fixes colors on Linux, see #1621
        main.commandLine.appendSwitch('force-color-profile', 'srgb');
    }

    // main.allowRendererProcessReuse = true;

    logProgress('setting env');
}

function setDevAppIcon() {
    if (isDev && htmlPath && process.platform === 'darwin') {
        const icon = electron.nativeImage.createFromPath(
            path.join(__dirname, '../graphics/512x512.png')
        );
        main.dock.setIcon(icon);
    }
}

// When sending a PUT XMLHttpRequest Chromium includes the header "Origin: file://".
// This confuses some WebDAV clients, notably OwnCloud.
// The header is invalid, so removing it everywhere it occurs should do no harm.

function hookRequestHeaders() {
    electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        if (
            !details.url.startsWith('ws:') &&
            !details.url.startsWith('https://plugins.keeweb.info/')
        ) {
            delete details.requestHeaders.Origin;
        }
        callback({ requestHeaders: details.requestHeaders });
    });
    logProgress('setting request handlers');
}

// If a display is disconnected while KeeWeb is minimized, Electron does not
// ensure that the restored window appears on a display that is still connected.
// This checks to be sure the title bar is somewhere the user can grab it,
// without making it impossible to minimize and restore a window keeping it
// partially off-screen or straddling two displays if the user desires that.

function coerceMainWindowPositionToConnectedDisplay() {
    const eScreen = electron.screen;
    const displays = eScreen.getAllDisplays();

    if (!displays || !displays.length) {
        return;
    }

    const windowBounds = mainWindow.getBounds();
    const contentBounds = mainWindow.getContentBounds();
    const tbLeft = windowBounds.x;
    const tbRight = windowBounds.x + windowBounds.width;
    const tbTop = windowBounds.y;
    const tbBottom = contentBounds.y;
    // 160px width and 2/3s the title bar height should be enough that the user can grab it
    for (let i = 0; i < displays.length; ++i) {
        const workArea = displays[i].workArea;
        const overlapWidth =
            Math.min(tbRight, workArea.x + workArea.width) - Math.max(tbLeft, workArea.x);
        const overlapHeight =
            Math.min(tbBottom, workArea.y + workArea.height) - Math.max(tbTop, workArea.y);

        if (overlapWidth >= 160 && 3 * overlapHeight >= 2 * (tbBottom - tbTop)) {
            return;
        }
    }
    // If we get here, no display contains a big enough strip of the title bar
    // that we can be confident the user can drag it into visibility.  Rather than
    // attempt to guess what the user wants, just center it on the primary display.
    // Try to keep the previous height and width, but clamp each to 90% of the workarea.
    const workArea = eScreen.getPrimaryDisplay().workArea;
    const newWidth = Math.min(windowBounds.width, Math.floor(0.9 * workArea.width));
    const newHeight = Math.min(windowBounds.height, Math.floor(0.9 * workArea.height));
    mainWindow.setBounds({
        'x': workArea.x + Math.floor((workArea.width - newWidth) / 2),
        'y': workArea.y + Math.floor((workArea.height - newHeight) / 2),
        'width': newWidth,
        'height': newHeight
    });
    updateMainWindowPosition();
}

function reportStartProfile() {
    if (!perfTimestamps) {
        return;
    }

    const processCreationTime = process.getCreationTime();
    const totalTime = Math.round(Date.now() - processCreationTime);
    let lastTs = 0;
    const timings = perfTimestamps
        .map((milestone) => {
            const ts = milestone.ts;
            const elapsed = lastTs
                ? Math.round((ts[0] - lastTs[0]) * 1e3 + (ts[1] - lastTs[1]) / 1e6)
                : 0;
            lastTs = ts;
            return {
                name: milestone.name,
                elapsed
            };
        })
        .slice(1);

    perfTimestamps = undefined;

    const startProfile = { totalTime, timings };
    emitRemoteEvent('start-profile', startProfile);
}

function getAppMainRoot() {
    if (isDev) {
        return __dirname;
    } else {
        return process.mainModule.path;
    }
}

function getAppContentRoot() {
    return __dirname;
}

function reqNative(mod) {
    const fileName = `${mod}-${process.platform}-${process.arch}.node`;

    const modulePath = `../node_modules/@keeweb/keeweb-native-modules/${fileName}`;
    const fullPath = path.join(getAppMainRoot(), modulePath);

    return require(fullPath);
}

function loadSettingsEncryptionKey() {
    return Promise.resolve().then(() => {
        if (usingPortableUserDataDir) {
            return null;
        }

        const keytar = reqNative('keytar');

        return keytar.getPassword('KeeWeb', 'settings-key').then((key) => {
            if (key) {
                return Buffer.from(key, 'hex');
            }
            key = require('crypto').randomBytes(48);
            return keytar.setPassword('KeeWeb', 'settings-key', key.toString('hex')).then(() => {
                return migrateOldConfigs(key).then(() => key);
            });
        });
    });
}

function loadConfig(name) {
    const ext = configEncryptionKey ? 'dat' : 'json';
    const configFilePath = path.join(main.getPath('userData'), `${name}.${ext}`);

    return new Promise((resolve, reject) => {
        fs.readFile(configFilePath, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    resolve(null);
                } else {
                    reject(`Error reading config ${name}: ${err}`);
                }
                return;
            }

            try {
                if (configEncryptionKey) {
                    const key = configEncryptionKey.slice(0, 32);
                    const iv = configEncryptionKey.slice(32, 48);

                    const crypto = require('crypto');
                    const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

                    data = Buffer.concat([cipher.update(data), cipher.final()]);
                }

                resolve(data.toString('utf8'));
            } catch (err) {
                logStartupMessage(`Error reading config data (config ignored) ${name}: ${err}`);
                resolve(null);
            }
        });
    });
}

function saveConfig(name, data, key) {
    if (!key) {
        key = configEncryptionKey;
    }

    return new Promise((resolve, reject) => {
        try {
            data = Buffer.from(data);

            if (key) {
                const crypto = require('crypto');
                const cipher = crypto.createCipheriv(
                    'aes-256-cbc',
                    key.slice(0, 32),
                    key.slice(32, 48)
                );

                data = Buffer.concat([cipher.update(data), cipher.final()]);
            }
        } catch (err) {
            return reject(`Error writing config data ${name}: ${err}`);
        }

        const ext = key ? 'dat' : 'json';
        const configFilePath = path.join(main.getPath('userData'), `${name}.${ext}`);
        fs.writeFile(configFilePath, data, (err) => {
            if (err) {
                reject(`Error writing config ${name}: ${err}`);
            } else {
                resolve();
            }
        });
    });
}

function loadLocale() {
    return loadConfig('locale').then((localeValues) => {
        if (localeValues) {
            try {
                localeValues = JSON.parse(localeValues);
                if (appSettings?.locale === localeValues?.locale) {
                    setLocale(localeValues);
                }
            } catch (e) {
                logStartupMessage(`Error loading locale: ${e}`);
            }
        }
        locale.on('changed', () => {
            setMenu();
            saveConfig('locale', JSON.stringify(getLocaleValues()));
        });
    });
}

// TODO: delete in 2021
function migrateOldConfigs(key) {
    const knownConfigs = [
        'file-info',
        'app-settings',
        'runtime-data',
        'update-info',
        'plugin-gallery',
        'plugins'
    ];

    const promises = [];

    for (const configName of knownConfigs) {
        promises.push(
            loadConfig(configName).then((data) => {
                if (data) {
                    return saveConfig(configName, data, key).then(() => {
                        fs.unlinkSync(path.join(main.getPath('userData'), `${configName}.json`));
                    });
                }
            })
        );
    }

    return Promise.all(promises);
}

function httpRequestQuery(config, log, onLoad) {
    // eslint-disable-next-line n/no-deprecated-api
    const opts = url.parse(config.url);

    opts.method = config.method || 'GET';
    opts.headers = {
        'User-Agent': mainWindow.webContents.userAgent,
        ...config.headers
    };
    opts.timeout = 60000;

    let data;
    if (config.data) {
        if (config.dataIsMultipart) {
            data = Buffer.concat(config.data.map((chunk) => Buffer.from(chunk)));
        } else {
            data = Buffer.from(config.data);
        }
        // Electron's API doesn't like that, while node.js needs it
        // opts.headers['Content-Length'] = data.byteLength;
    }

    const req = electron.net.request(opts);
    req.on('response', (res) => {
        const chunks = [];
        const onClose = () => {
            log('info', 'HTTP response', opts.method, config.url, res.statusCode, res.headers);
            onLoad({
                status: res.statusCode,
                response: Buffer.concat(chunks).toString('hex'),
                headers: res.headers
            });
        };
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });
        res.on('end', () => {
            onClose();
        });
    });

    req.on('error', (e) => {
        log('error', 'HTTP error', opts.method, config.url, e);
        return config.error && config.error('network error', {});
    });

    req.on('timeout', () => {
        req.abort();
        return config.error && config.error('timeout', {});
    });

    if (data) {
        req.write(data);
    }

    req.end();
}

function setupIpcHandlers() {
    const { setupIpcHandlers } = require('./scripts/ipc');
    setupIpcHandlers();
    logProgress('setting ipc handlers');
}

function exitAndStartUpdate() {
    if (pendingUpdateFilePath) {
        const { installUpdate } = require('./scripts/update-installer');
        installUpdate(pendingUpdateFilePath);
    }
}

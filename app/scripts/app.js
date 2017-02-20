'use strict';

const AppModel = require('./models/app-model');
const AppView = require('./views/app-view');
const AppSettingsModel = require('./models/app-settings-model');
const UpdateModel = require('./models/update-model');
const RuntimeDataModel = require('./models/runtime-data-model');
const FileInfoCollection = require('./collections/file-info-collection');
const KeyHandler = require('./comp/key-handler');
const IdleTracker = require('./comp/idle-tracker');
const PopupNotifier = require('./comp/popup-notifier');
const SingleInstanceChecker = require('./comp/single-instance-checker');
const Alerts = require('./comp/alerts');
const Updater = require('./comp/updater');
const AuthReceiver = require('./comp/auth-receiver');
const ExportApi = require('./comp/export-api');
const SettingsManager = require('./comp/settings-manager');
const PluginManager = require('./plugins/plugin-manager');
const Launcher = require('./comp/launcher');
const KdbxwebInit = require('./util/kdbxweb-init');
const Locale = require('./util/locale');
const Logger = require('./util/logger');

const ready = Launcher && Launcher.ready || $;

ready(() => {
    if (isPopup()) {
        return AuthReceiver.receive();
    }
    loadMixins();
    let appModel;
    const logger = new Logger('app');
    initModules().then(() => {
        appModel = new AppModel();
        SettingsManager.setBySettings(appModel.settings);
        const configParam = getConfigParam();
        if (configParam) {
            appModel.loadConfig(configParam, err => {
                SettingsManager.setBySettings(appModel.settings);
                if (err && !appModel.settings.get('cacheConfigSettings')) {
                    showSettingsLoadError();
                } else {
                    showApp();
                }
            });
        } else {
            showApp();
        }
    });

    const appModel = new AppModel();
    SettingsManager.setBySettings(appModel.settings);
    const configParam = getConfigParam();
    if (configParam) {
        appModel.loadConfig(configParam, err => {
            SettingsManager.setBySettings(appModel.settings);
            if (err && !appModel.settings.get('cacheConfigSettings')) {
                showSettingsLoadError();
            } else {
                showApp();
            }
        });
    } else {
        showApp();
    }

    /* const appModel = new AppModel();

    Promise.all([
        AppSettingsModel.instance.load(),
        UpdateModel.instance.load(),
        RuntimeDataModel.instance.load(),
        FileInfoCollection.instance.load()
    ])
    .then(loadRemoteConfig())
    .then(showApp); */

    function isPopup() {
        return (window.parent !== window.top) || window.opener;
    }

    function loadMixins() {
        require('./mixins/view');
        require('./helpers');
    }

    function initModules() {
        const promises = [];
        KeyHandler.init();
        IdleTracker.init();
        PopupNotifier.init();
        KdbxwebInit.init();
        promises.push(PluginManager.init());
        window.kw = ExportApi;
        return Promise.all(promises);
    }

    function showSettingsLoadError() {
        Alerts.error({
            header: Locale.appSettingsError,
            body: Locale.appSettingsErrorBody,
            buttons: [],
            esc: false, enter: false, click: false
        });
    }

    function loadRemoteConfig() {
        return new Promise((resolve, reject) => {
            SettingsManager.setBySettings(appModel.settings);
            const configParam = getConfigParam();
            if (configParam) {
                appModel.loadConfig(configParam, err => {
                    SettingsManager.setBySettings(appModel.settings);
                    if (err && !appModel.settings.get('cacheConfigSettings')) {
                        showSettingsLoadError();
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    function showApp() {
        const skipHttpsWarning = localStorage.skipHttpsWarning || appModel.settings.get('skipHttpsWarning');
        const protocolIsInsecure = ['https:', 'file:', 'app:'].indexOf(location.protocol) < 0;
        const hostIsInsecure = location.hostname !== 'localhost';
        if (protocolIsInsecure && hostIsInsecure && !skipHttpsWarning) {
            Alerts.error({ header: Locale.appSecWarn, icon: 'user-secret', esc: false, enter: false, click: false,
                body: Locale.appSecWarnBody1 + '<br/><br/>' + Locale.appSecWarnBody2,
                buttons: [
                    { result: '', title: Locale.appSecWarnBtn, error: true }
                ],
                complete: showView
            });
        } else {
            showView();
        }
    }

    function showView() {
        appModel.prepare();
        new AppView({ model: appModel }).render();
        Updater.init();
        SingleInstanceChecker.init();
        const time = Math.round(performance.now());
        logger.info(`Started in ${time}ms ¯\\_(ツ)_/¯`);
    }

    function getConfigParam() {
        const metaConfig = document.head.querySelector('meta[name=kw-config]');
        if (metaConfig && metaConfig.content && metaConfig.content[0] !== '(') {
            return metaConfig.content;
        }
        const match = location.search.match(/[?&]config=([^&]+)/i);
        if (match && match[1]) {
            return match[1];
        }
    }
});

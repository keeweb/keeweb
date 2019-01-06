const Backbone = require('backbone');
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
const AppRightsChecker = require('./comp/app-rights-checker');
const Alerts = require('./comp/alerts');
const Updater = require('./comp/updater');
const AuthReceiver = require('./comp/auth-receiver');
const ExportApi = require('./comp/export-api');
const SettingsManager = require('./comp/settings-manager');
const PluginManager = require('./plugins/plugin-manager');
const Launcher = require('./comp/launcher');
const FeatureTester = require('./comp/feature-tester');
const Timeouts = require('./const/timeouts');
const FeatureDetector = require('./util/feature-detector');
const KdbxwebInit = require('./util/kdbxweb-init');
const Locale = require('./util/locale');

const ready = Launcher && Launcher.ready || $;

ready(() => {
    if (FeatureDetector.isPopup && AuthReceiver.receive() || FeatureDetector.isFrame) {
        return;
    }
    loadMixins();

    const appModel = new AppModel();

    Promise.resolve()
        .then(loadConfigs)
        .then(initModules)
        .then(loadRemoteConfig)
        .then(ensureCanRun)
        .then(showApp)
        .then(postInit)
        .catch(e => {
            appModel.appLogger.error('Error starting app', e);
        });

    function loadMixins() {
        require('./mixins/view');
        require('./helpers');
    }

    function ensureCanRun() {
        return FeatureTester.test()
            .catch(e => {
                Alerts.error({
                    header: Locale.appSettingsError,
                    body: Locale.appNotSupportedError + '<br/><br/>' + e,
                    buttons: [],
                    esc: false, enter: false, click: false
                });
                throw 'Feature testing failed: ' + e;
            });
    }

    function loadConfigs() {
        return Promise.all([
            AppSettingsModel.instance.load(),
            UpdateModel.instance.load(),
            RuntimeDataModel.instance.load(),
            FileInfoCollection.instance.load()
        ]);
    }

    function initModules() {
        KeyHandler.init();
        IdleTracker.init();
        PopupNotifier.init();
        KdbxwebInit.init();
        window.kw = ExportApi;
        return PluginManager.init();
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
        return Promise.resolve().then(() => {
            SettingsManager.setBySettings(appModel.settings);
            const configParam = getConfigParam();
            if (configParam) {
                return appModel.loadConfig(configParam).then(() => {
                    SettingsManager.setBySettings(appModel.settings);
                }).catch(e => {
                    if (!appModel.settings.get('cacheConfigSettings')) {
                        showSettingsLoadError();
                        throw e;
                    }
                });
            }
        });
    }

    function showApp() {
        return Promise.resolve()
            .then(() => {
                const skipHttpsWarning = localStorage.skipHttpsWarning || appModel.settings.get('skipHttpsWarning');
                const protocolIsInsecure = ['https:', 'file:', 'app:'].indexOf(location.protocol) < 0;
                const hostIsInsecure = location.hostname !== 'localhost';
                if (protocolIsInsecure && hostIsInsecure && !skipHttpsWarning) {
                    return new Promise(resolve => {
                        Alerts.error({
                            header: Locale.appSecWarn, icon: 'user-secret', esc: false, enter: false, click: false,
                            body: Locale.appSecWarnBody1 + '<br/><br/>' + Locale.appSecWarnBody2,
                            buttons: [
                                {result: '', title: Locale.appSecWarnBtn, error: true}
                            ],
                            complete: () => {
                                showView();
                                resolve();
                            }
                        });
                    });
                } else {
                    showView();
                }
            });
    }

    function postInit() {
        Updater.init();
        SingleInstanceChecker.init();
        AppRightsChecker.init();
        setTimeout(() => PluginManager.runAutoUpdate(), Timeouts.AutoUpdatePluginsAfterStart);
    }

    function showView() {
        appModel.prepare();
        new AppView({ model: appModel }).render();
        Backbone.trigger('app-ready');
        logStartupTime();
    }

    function logStartupTime() {
        const time = Math.round(performance.now());
        appModel.appLogger.info(`Started in ${time}ms ¯\\_(ツ)_/¯`);
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

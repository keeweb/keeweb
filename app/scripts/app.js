import $ from 'jquery';
import Backbone from 'backbone';
import AppModel from './models/app-model';
import AppView from './views/app-view';
import AppSettingsModel from './models/app-settings-model';
import UpdateModel from './models/update-model';
import RuntimeDataModel from './models/runtime-data-model';
import FileInfoCollection from './collections/file-info-collection';
import KeyHandler from './comp/key-handler';
import IdleTracker from './comp/idle-tracker';
import PopupNotifier from './comp/popup-notifier';
import SingleInstanceChecker from './comp/single-instance-checker';
import AppRightsChecker from './comp/app-rights-checker';
import Alerts from './comp/alerts';
import Updater from './comp/updater';
import AuthReceiver from './comp/auth-receiver';
import ExportApi from './comp/export-api';
import SettingsManager from './comp/settings-manager';
import PluginManager from './plugins/plugin-manager';
import Launcher from './comp/launcher';
import FeatureTester from './comp/feature-tester';
import FocusDetector from './comp/focus-detector';
import Timeouts from './const/timeouts';
import FeatureDetector from './util/feature-detector';
import KdbxwebInit from './util/kdbxweb-init';
import Locale from './util/locale';

const ready = Launcher && Launcher.ready || $;

ready(() => {
    if (AuthReceiver.receive() || FeatureDetector.isFrame) {
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
        FocusDetector.init();
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
                const protocolIsInsecure = ['https:', 'file:', 'app:'].indexOf(window.location.protocol) < 0;
                const hostIsInsecure = window.location.hostname !== 'localhost';
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
        const match = window.location.search.match(/[?&]config=([^&]+)/i);
        if (match && match[1]) {
            return match[1];
        }
    }
});

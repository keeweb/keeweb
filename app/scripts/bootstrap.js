'use strict';

const AppModel = require('./models/app-model');
const AppView = require('./views/app-view');
const KeyHandler = require('./comp/key-handler');
const IdleTracker = require('./comp/idle-tracker');
const PopupNotifier = require('./comp/popup-notifier');
const SingleInstanceChecker = require('./comp/single-instance-checker');
const Alerts = require('./comp/alerts');
const Updater = require('./comp/updater');
const AuthReceiver = require('./comp/auth-receiver');
const ExportApi = require('./comp/export-api');
const SettingsManager = require('./comp/settings-manager');
const KdbxwebInit = require('./util/kdbxweb-init');
const Locale = require('./util/locale');

$(() => {
    if (isPopup()) {
        return AuthReceiver.receive();
    }
    loadMixins();
    initModules();

    const appModel = new AppModel();
    SettingsManager.setBySettings(appModel.settings);
    const configParam = getConfigParam();
    if (configParam) {
        appModel.loadConfig(configParam, err => {
            SettingsManager.setBySettings(appModel.settings);
            if (err) {
                showSettingsLoadError();
            } else {
                showApp();
            }
        });
    } else {
        showApp();
    }

    function isPopup() {
        return (window.parent !== window.top) || window.opener;
    }

    function loadMixins() {
        require('./mixins/view');
        require('./helpers');
    }

    function initModules() {
        KeyHandler.init();
        IdleTracker.init();
        PopupNotifier.init();
        KdbxwebInit.init();
        window.kw = ExportApi;
    }

    function showSettingsLoadError() {
        Alerts.error({
            header: Locale.appSettingsError,
            body: Locale.appSettingsErrorBody,
            buttons: [],
            esc: false, enter: false, click: false
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

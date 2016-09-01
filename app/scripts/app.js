'use strict';

var AppModel = require('./models/app-model'),
    AppView = require('./views/app-view'),
    KeyHandler = require('./comp/key-handler'),
    IdleTracker = require('./comp/idle-tracker'),
    PopupNotifier = require('./comp/popup-notifier'),
    Alerts = require('./comp/alerts'),
    Updater = require('./comp/updater'),
    AuthReceiver = require('./comp/auth-receiver'),
    ExportApi = require('./comp/export-api'),
    SettingsManager = require('./util/settings-manager'),
    Locale = require('./util/locale');

$(() => {
    if (isPopup()) {
        return AuthReceiver.receive();
    }
    loadMixins();
    initModules();

    var appModel = new AppModel();
    SettingsManager.setBySettings(appModel.settings);
    var configParam = getConfigParam();
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
        var skipHttpsWarning = localStorage.skipHttpsWarning || appModel.settings.get('skipHttpsWarning');
        if (['https:', 'file:', 'app:'].indexOf(location.protocol) < 0 && !skipHttpsWarning) {
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
        new AppView({ model: appModel }).render();
        Updater.init();
    }

    function getConfigParam() {
        let metaConfig = document.head.querySelector('meta[name=kw-config]');
        if (metaConfig && metaConfig.content && metaConfig.content[0] !== '(') {
            return metaConfig.content;
        }
        var match = location.search.match(/[?&]config=([^&]+)/i);
        if (match && match[1]) {
            return match[1];
        }
    }
});

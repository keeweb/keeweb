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
    ThemeChanger = require('./util/theme-changer'),
    Locale = require('./util/locale');

$(function() {
    if ((window.parent !== window.top) || window.opener) {
        return AuthReceiver.receive();
    }
    require('./mixins/view');
    require('./helpers');
    KeyHandler.init();
    IdleTracker.init();
    PopupNotifier.init();
    window.kw = ExportApi;

    var appModel = new AppModel();
    ThemeChanger.setBySettings(appModel.settings);
    var skipHttpsWarning = localStorage.skipHttpsWarning || appModel.settings.get('skipHttpsWarning');
    if (['https:', 'file:', 'app:'].indexOf(location.protocol) < 0 && !skipHttpsWarning) {
        Alerts.error({ header: Locale.appSecWarn, icon: 'user-secret', esc: false, enter: false, click: false,
            body: Locale.appSecWarnBody1 + '<br/><br/>' + Locale.appSecWarnBody2,
            buttons: [
                { result: '', title: Locale.appSecWarnBtn, error: true }
            ],
            complete: showApp
        });
    } else {
        showApp();
    }

    function showApp() {
        new AppView({ model: appModel }).render();
        Updater.init();
    }
});

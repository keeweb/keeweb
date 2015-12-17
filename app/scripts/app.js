'use strict';

var AppModel = require('./models/app-model'),
    AppView = require('./views/app-view'),
    KeyHandler = require('./comp/key-handler'),
    IdleTracker = require('./comp/idle-tracker'),
    Alerts = require('./comp/alerts'),
    DropboxLink = require('./comp/dropbox-link'),
    Updater = require('./comp/updater'),
    ThemeChanger = require('./util/theme-changer'),
    Locale = require('./util/locale');

$(function() {
    if (location.href.indexOf('state=') >= 0) {
        DropboxLink.receive();
        return;
    }
    require('./mixins/view');
    require('./helpers');
    KeyHandler.init();
    IdleTracker.init();

    var appModel = new AppModel();
    if (appModel.settings.get('theme')) {
        ThemeChanger.setTheme(appModel.settings.get('theme'));
    }
    if (['https:', 'file:', 'app:'].indexOf(location.protocol) < 0 && !localStorage.disableSecurityCheck) {
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

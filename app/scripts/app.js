'use strict';

var AppModel = require('./models/app-model'),
    AppView = require('./views/app-view'),
    KeyHandler = require('./comp/key-handler'),
    Alerts = require('./comp/alerts'),
    DropboxLink = require('./comp/dropbox-link'),
    LastOpenFiles = require('./comp/last-open-files'),
    ThemeChanger = require('./util/theme-changer');

$(function() {
    require('./mixins/view');

    if (location.href.indexOf('state=') >= 0) {
        DropboxLink.receive();
        return;
    }
    KeyHandler.init();

    var appModel = new AppModel();
    if (appModel.settings.get('theme')) {
        ThemeChanger.setTheme(appModel.settings.get('theme'));
    }
    if (['https:', 'file:', 'app:'].indexOf(location.protocol) < 0 && !localStorage.disableSecurityCheck) {
        Alerts.error({ header: 'Not Secure!', icon: 'user-secret', esc: false, enter: false, click: false,
            body: 'You have loaded this app with insecure connection. ' +
                'Someone may be watching you and stealing your passwords. ' +
                'We strongly advice you to stop, unless you clearly understand what you\'re doing.' +
                '<br/><br/>' +
                'Yes, your database is encrypted but no one can guarantee that the app has not been modified on the way to you.',
            buttons: [
                { result: '', title: 'I understand the risks, continue', error: true }
            ],
            complete: showApp
        });
    } else {
        showApp();
    }

    function showApp() {
        var appView = new AppView({ model: appModel }).render();

        var lastOpenFiles = LastOpenFiles.all();
        var lastOpenFile = lastOpenFiles[0];
        if (lastOpenFile && lastOpenFile.storage === 'file' && lastOpenFile.path) {
            appView.showOpenFile(lastOpenFile.path);
        } else {
            appView.showOpenFile();
        }
    }
});


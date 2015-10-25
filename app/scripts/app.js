'use strict';

var AppModel = require('./models/app-model'),
    AppView = require('./views/app-view'),
    KeyHandler = require('./comp/key-handler'),
    Alerts = require('./comp/alerts');

$(function() {
    require('./mixins/view');
    KeyHandler.init();
    if (['https:', 'file:', 'app:'].indexOf(location.protocol) < 0) {
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
        var appModel = new AppModel();
        new AppView({ model: appModel }).render().showOpenFile(appModel.settings.get('lastOpenFile'));
    }
});


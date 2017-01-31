'use strict';

const DropboxLink = require('./dropbox-link');

const AuthReceiver = {
    receive: function() {
        const opener = window.opener || window.parent;
        if (location.href.indexOf('state=') >= 0) {
            DropboxLink.receive();
        } else {
            const message = this.urlArgsToMessage(window.location.href);
            opener.postMessage(message, window.location.origin);
            window.close();
        }
    },

    urlArgsToMessage: function(url) {
        const message = {};
        url.split(/[\?#&]/g).forEach(part => {
            const parts = part.split('=');
            if (parts.length === 2) {
                message[parts[0]] = parts[1];
            }
        });
        return message;
    }
};

module.exports = AuthReceiver;

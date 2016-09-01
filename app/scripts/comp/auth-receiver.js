'use strict';

var DropboxLink = require('./dropbox-link');

var AuthReceiver = {
    receive: function() {
        var opener = window.opener || window.parent;
        if (location.href.indexOf('state=') >= 0) {
            DropboxLink.receive();
        } else {
            var message = this.urlArgsToMessage(window.location.href);
            opener.postMessage(message, window.location.origin);
            window.close();
        }
    },

    urlArgsToMessage: function(url) {
        var message = {};
        url.split(/[\?#&]/g).forEach(part => {
            var parts = part.split('=');
            if (parts.length === 2) {
                message[parts[0]] = parts[1];
            }
        });
        return message;
    }
};

module.exports = AuthReceiver;

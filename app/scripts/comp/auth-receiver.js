'use strict';

var DropboxLink = require('./dropbox-link');

var AuthReceiver = {
    receive: function() {
        var opener = window.opener || window.parent;
        if (location.href.indexOf('state=') >= 0) {
            DropboxLink.receive();
        } else {
            var message = {};
            window.location.href.split(/[\?#&]/g).forEach(function(part) {
                var parts = part.split('=');
                if (parts.length === 2) {
                    message[parts[0]] = parts[1];
                }
            });
            opener.postMessage(message, window.location.origin);
        }
    }
};

module.exports = AuthReceiver;

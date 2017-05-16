const FeatureDetector = require('../util/feature-detector');
const Storage = require('../storage');

const AuthReceiver = {
    receive: function() {
        const opener = window.opener || window.parent;
        const message = this.urlArgsToMessage(window.location.href);
        if (FeatureDetector.isStandalone) {
            Storage[sessionStorage.authStorage].handleOAuthReturnMessage(message);
            return false;
        } else {
            opener.postMessage(message, window.location.origin);
            window.close();
            return true;
        }
    },

    urlArgsToMessage: function(url) {
        const message = {};
        url.split(/[?#&]/g).forEach(part => {
            const parts = part.split('=');
            if (parts.length === 2) {
                message[parts[0]] = parts[1];
            }
        });
        return message;
    }
};

module.exports = AuthReceiver;

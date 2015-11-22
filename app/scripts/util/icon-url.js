'use strict';

var kdbxweb = require('kdbxweb');

var IconUrl = {
    toDataUrl: function(iconData) {
        return iconData ? 'data:image/png;base64,' + kdbxweb.ByteUtils.bytesToBase64(iconData) : null;
    }
};

module.exports = IconUrl;

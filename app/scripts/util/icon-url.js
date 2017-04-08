const kdbxweb = require('kdbxweb');

const IconUrl = {
    toDataUrl: function(iconData) {
        return iconData ? 'data:image/png;base64,' + kdbxweb.ByteUtils.bytesToBase64(iconData) : null;
    }
};

module.exports = IconUrl;

const kdbxweb = require('kdbxweb');

const IconUrlFormat = {
    toDataUrl(iconData) {
        return iconData
            ? 'data:image/png;base64,' + kdbxweb.ByteUtils.bytesToBase64(iconData)
            : null;
    }
};

module.exports = IconUrlFormat;

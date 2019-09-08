const FieldViewText = require('./field-view-text');

const FieldViewUrl = FieldViewText.extend({
    displayUrlRegex: /^http:\/\//i,
    cssClass: 'url',

    renderValue(value) {
        return value
            ? '<a href="' +
                  _.escape(this.fixUrl(value)) +
                  '" rel="noreferrer noopener" target="_blank">' +
                  _.escape(this.displayUrl(value)) +
                  '</a>'
            : '';
    },

    fixUrl(url) {
        return url.indexOf(':') < 0 ? 'http://' + url : url;
    },

    displayUrl(url) {
        return url.replace(this.displayUrlRegex, '');
    }
});

module.exports = FieldViewUrl;

const FieldViewText = require('./field-view-text');

const FieldViewUrl = FieldViewText.extend({
    displayUrlRegex: /^http:\/\//i,

    renderValue: function(value) {
        return value ? '<a href="' + _.escape(this.fixUrl(value)) + '" rel="noreferrer" target="_blank">' + _.escape(this.displayUrl(value)) + '</a>' : '';
    },

    fixUrl: function(url) {
        return url.indexOf(':') < 0 ? 'http://' + url : url;
    },

    displayUrl: function(url) {
        return url.replace(this.displayUrlRegex, '');
    }
});

module.exports = FieldViewUrl;

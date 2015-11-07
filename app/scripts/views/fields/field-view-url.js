'use strict';

var FieldViewText = require('./field-view-text');

var FieldViewUrl = FieldViewText.extend({
    renderValue: function(value) {
        return value ? '<a href="' + _.escape(this.fixUrl(value)) + '" target="_blank">' + _.escape(value) + '</a>' : '';
    },

    fixUrl: function(url) {
        return url.indexOf(':') < 0 ? 'http://' + url : url;
    }
});

module.exports = FieldViewUrl;

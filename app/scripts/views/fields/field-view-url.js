'use strict';

var FieldViewText = require('./field-view-text');

var FieldViewUrl = FieldViewText.extend({
    renderValue: function(value) {
        return value ? '<a href="' + _.escape(value) + '" target="_blank">' + _.escape(value) + '</a>' : '';
    }
});

module.exports = FieldViewUrl;

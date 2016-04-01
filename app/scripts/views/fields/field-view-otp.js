'use strict';

var FieldViewText = require('./field-view-text');

var FieldViewOtp = FieldViewText.extend({
    renderValue: function(value) {
        return value && value.pass || '';
    },

    getEditValue: function(value) {
        return value ? value.url : '';
    }
});

module.exports = FieldViewOtp;

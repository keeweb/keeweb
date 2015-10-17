'use strict';

var FieldView = require('./field-view');

var FieldViewReadOnly = FieldView.extend({
    renderValue: function(value) {
        return typeof value.byteLength === 'number' ? new Array(value.byteLength + 1).join('•') : _.escape(value);
    },

    readonly: true
});

module.exports = FieldViewReadOnly;

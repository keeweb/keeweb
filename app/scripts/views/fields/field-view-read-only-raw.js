'use strict';

var FieldView = require('./field-view');

var FieldViewReadOnlyRaw = FieldView.extend({
    renderValue: function(value) {
        return value;
    },

    readonly: true
});

module.exports = FieldViewReadOnlyRaw;

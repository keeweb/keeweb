const FieldView = require('./field-view');

const FieldViewReadOnly = FieldView.extend({
    renderValue: function(value) {
        return value.isProtected ? new Array(value.textLength + 1).join('•') : _.escape(value);
    },

    readonly: true
});

module.exports = FieldViewReadOnly;

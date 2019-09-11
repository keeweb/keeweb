const FieldView = require('./field-view');

const FieldViewReadOnly = FieldView.extend({
    renderValue(value) {
        value = value.isProtected ? new Array(value.textLength + 1).join('•') : _.escape(value);
        value = value.replace(/\n/g, '<br/>');
        return value;
    },

    readonly: true
});

module.exports = FieldViewReadOnly;

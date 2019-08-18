const FieldView = require('./field-view');

const FieldViewReadOnlyRaw = FieldView.extend({
    renderValue(value) {
        return value;
    },

    readonly: true
});

module.exports = FieldViewReadOnlyRaw;

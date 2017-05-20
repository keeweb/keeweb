const FieldView = require('./field-view');

const FieldViewReadOnlyRaw = FieldView.extend({
    renderValue: function(value) {
        return value;
    },

    readonly: true
});

module.exports = FieldViewReadOnlyRaw;

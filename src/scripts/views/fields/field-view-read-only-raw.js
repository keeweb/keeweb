import FieldView from './field-view';

const FieldViewReadOnlyRaw = FieldView.extend({
    renderValue: function(value) {
        return value;
    },

    readonly: true
});

export default FieldViewReadOnlyRaw;

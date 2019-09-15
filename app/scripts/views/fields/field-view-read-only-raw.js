import { FieldView } from 'views/fields/field-view';

const FieldViewReadOnlyRaw = FieldView.extend({
    renderValue(value) {
        return value;
    },

    readonly: true
});

export { FieldViewReadOnlyRaw };

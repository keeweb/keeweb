import { FieldView } from 'views/fields/field-view';

class FieldViewReadOnly extends FieldView {
    readonly = true;

    renderValue(value) {
        value = value.isProtected ? new Array(value.textLength + 1).join('•') : _.escape(value);
        value = value.replace(/\n/g, '<br/>');
        return value;
    }
}

export { FieldViewReadOnly };

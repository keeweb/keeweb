import { FieldView } from 'views/fields/field-view';
import { escape } from 'util/fn';

class FieldViewReadOnly extends FieldView {
    readonly = true;

    renderValue(value) {
        value = value?.isProtected ? new Array(value.textLength + 1).join('•') : escape(value);
        value = value.replace(/\n/g, '<br/>');
        return value;
    }
}

export { FieldViewReadOnly };

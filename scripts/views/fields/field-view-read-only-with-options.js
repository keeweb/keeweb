import { FieldViewText } from 'views/fields/field-view-text';

class FieldViewReadOnlyWithOptions extends FieldViewText {
    readonly = true;
    hasOptions = true;
}

export { FieldViewReadOnlyWithOptions };

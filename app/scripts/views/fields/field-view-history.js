import { Locale } from 'util/locale';
import { FieldView } from 'views/fields/field-view';

class FieldViewHistory extends FieldView {
    readonly = true;

    renderValue(value) {
        if (!value.length) {
            return Locale.detHistoryEmpty;
        }
        let text =
            value.length +
            ' ' +
            (value.length === 1 ? Locale.detHistoryRec : Locale.detHistoryRecs);
        if (value.unsaved) {
            text += ' (' + Locale.detHistoryModified + ')';
        }
        return '<a class="details__history-link">' + text + '</a>';
    }
}

export { FieldViewHistory };

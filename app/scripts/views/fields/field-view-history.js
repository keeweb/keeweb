import { Locale } from 'util/locale';
import { FieldView } from 'views/fields/field-view';

const FieldViewHistory = FieldView.extend({
    renderValue(value) {
        if (!value.length) {
            return Locale.detHistoryEmpty;
        }
        let text =
            value.length +
            ' ' +
            (value.length % 10 === 1 ? Locale.detHistoryRec : Locale.detHistoryRecs);
        if (value.unsaved) {
            text += ' (' + Locale.detHistoryModified + ')';
        }
        return '<a class="details__history-link">' + text + '</a>';
    },

    readonly: true
});

export { FieldViewHistory };

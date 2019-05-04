import FieldView from './field-view';
import Locale from '../../util/locale';

const FieldViewHistory = FieldView.extend({
    renderValue: function(value) {
        if (!value.length) {
            return Locale.detHistoryEmpty;
        }
        let text = value.length + ' ' + (value.length % 10 === 1 ? Locale.detHistoryRec : Locale.detHistoryRecs);
        if (value.unsaved) {
            text += ' (' + Locale.detHistoryModified + ')';
        }
        return '<a class="details__history-link">' + text + '</a>';
    },

    readonly: true
});

export default FieldViewHistory;

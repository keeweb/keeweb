const FieldView = require('./field-view');
const Locale = require('../../util/locale');

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

module.exports = FieldViewHistory;

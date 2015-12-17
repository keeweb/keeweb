'use strict';

var FieldView = require('./field-view'),
    Locale = require('../../util/locale');

var FieldViewHistory = FieldView.extend({
    renderValue: function(value) {
        if (!value.length) {
            return Locale.detHistoryEmpty;
        }
        var text = value.length + ' ' + (value.length % 10 === 1 ? Locale.detHistoryRec : Locale.detHistoryRecs);
        if (value.unsaved) {
            text += ' (' + Locale.detHistoryModified + ')';
        }
        return '<a class="details__history-link">' + text + '</a>';
    },

    readonly: true
});

module.exports = FieldViewHistory;

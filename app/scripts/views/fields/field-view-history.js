'use strict';

var FieldView = require('./field-view');

var FieldViewHistory = FieldView.extend({
    renderValue: function(value) {
        if (!value.length) {
            return 'empty';
        }
        var text = value.length + ' record' + (value.length % 10 === 1 ? '' : 's');
        if (value.unsaved) {
            text += ' (modified)';
        }
        return '<a class="details__history-link">' + text + '</a>';
    },

    readonly: true
});

module.exports = FieldViewHistory;

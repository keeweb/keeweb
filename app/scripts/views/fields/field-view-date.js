'use strict';

var FieldViewText = require('./field-view-text'),
    Locale = require('../../util/locale'),
    Pikaday = require('pikaday'),
    Format = require('../../util/format');

var FieldViewDate = FieldViewText.extend({
    renderValue: function(value) {
        var result = value ? Format.dStr(value) : '';
        if (value && this.model.lessThanNow && value < new Date()) {
            result += ' ' + this.model.lessThanNow;
        }
        return result;
    },

    getEditValue: function(value) {
        return value ? Format.dStr(value) : '';
    },

    startEdit: function() {
        FieldViewText.prototype.startEdit.call(this);
        this.picker = new Pikaday({
            field: this.input[0],
            onSelect: this.pickerSelect.bind(this),
            onClose: this.pickerClose.bind(this),
            defaultDate: this.value,
            minDate: new Date(),
            firstDay: 1,
            i18n: {
                previousMonth: '',
                nextMonth: '',
                months: Locale.months,
                weekdays: Locale.weekdays,
                weekdaysShort: Locale.weekdaysShort
            }
        });
        _.defer(this.picker.show.bind(this.picker));
    },

    fieldValueBlur: function(e) {
        if (!this.picker) {
            FieldViewText.prototype.fieldValueBlur.call(this, e);
        }
    },

    endEdit: function(newVal, extra) {
        if (this.picker) {
            try { this.picker.destroy(); } catch (e) {}
            this.picker = null;
        }
        newVal = new Date(newVal);
        if (!newVal || isNaN(newVal.getTime())) {
            newVal = null;
        }
        FieldViewText.prototype.endEdit.call(this, newVal, extra);
    },

    pickerClose: function() {
        this.endEdit(this.input.val());
    },

    pickerSelect: function(dt) {
        this.endEdit(dt);
    }
});

module.exports = FieldViewDate;

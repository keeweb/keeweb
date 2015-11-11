'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../../util/feature-detector'),
    CopyPaste = require('../../util/copy-paste');

var FieldView = Backbone.View.extend({
    template: require('templates/details/field.html'),

    events: {
        'click .details__field-label': 'fieldLabelClick',
        'click .details__field-value': 'fieldValueClick'
    },

    initialize: function () {
    },

    render: function () {
        this.value = typeof this.model.value === 'function' ? this.model.value() : this.model.value;
        this.renderTemplate({ editable: !this.readonly, multiline: this.model.multiline, title: this.model.title,
            canEditTitle: this.model.newField });
        this.valueEl = this.$el.find('.details__field-value');
        this.valueEl.html(this.renderValue(this.value));
        this.labelEl = this.$el.find('.details__field-label');
        return this;
    },

    update: function() {
        if (typeof this.model.value === 'function') {
            var newVal = this.model.value();
            if (!_.isEqual(newVal, this.value) || (this.value && newVal && this.value.toString() !== newVal.toString())) {
                this.render();
            }
        }
    },

    fieldLabelClick: function(e) {
        e.stopImmediatePropagation();
        var field = this.model.name;
        if (FeatureDetector.shouldMoveHiddenInputToCopySource()) {
            var box = this.valueEl[0].getBoundingClientRect();
            var textValue = this.value && this.value.getText ? this.value.getText() : this.getEditValue(this.value);
            if (!textValue) {
                return;
            }
            CopyPaste.createHiddenInput(textValue, box);
            //CopyPaste.tryCopy(); // maybe Apple will ever support this?
            return;
        }
        if (field) {
            var value = this.value || '';
            if (value && value.getText) {
                CopyPaste.createHiddenInput(value.getText());
                CopyPaste.tryCopy();
                return;
            }
        }
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(this.valueEl[0]);
        selection.removeAllRanges();
        selection.addRange(range);
        if (CopyPaste.tryCopy()) {
            selection.removeAllRanges();
        }
    },

    fieldValueClick: function(e) {
        if (['a', 'input', 'textarea'].indexOf(e.target.tagName.toLowerCase()) >= 0) {
            return;
        }
        var sel = window.getSelection().toString();
        if (!sel) {
            this.edit();
        }
    },

    edit: function() {
        if (this.readonly || this.editing) {
            return;
        }
        this.$el.addClass('details__field--edit');
        this.startEdit();
        this.editing = true;
    },

    endEdit: function(newVal, extra) {
        if (!this.editing) {
            return;
        }
        this.editing = false;
        var oldValText = this.value && this.value.getText ? this.value.getText() : this.value;
        var newValText = newVal && newVal.getText ? newVal.getText() : newVal;
        var textEqual = _.isEqual(newValText, oldValText);
        var protectedEqual = (newVal && typeof newVal.getText) === (this.value && typeof this.value.getText);
        var arg;
        if (newVal !== undefined && (!textEqual || !protectedEqual)) {
            arg = { val: newVal, field: this.model.name };
            if (extra) {
                _.extend(arg, extra);
            }
        } else if (extra) {
            arg = extra;
        }
        if (arg) {
            arg.sender = this;
            this.trigger('change', arg);
        }
        this.valueEl.html(this.renderValue(this.value));
        this.$el.removeClass('details__field--edit');
    }
});

module.exports = FieldView;

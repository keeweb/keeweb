'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../../util/feature-detector'),
    CopyPaste = require('../../comp/copy-paste'),
    Tip = require('../../util/tip');

var FieldView = Backbone.View.extend({
    template: require('templates/details/field.hbs'),

    events: {
        'click .details__field-label': 'fieldLabelClick',
        'click .details__field-value': 'fieldValueClick'
    },

    render: function() {
        this.value = typeof this.model.value === 'function' ? this.model.value() : this.model.value;
        this.renderTemplate({ editable: !this.readonly, multiline: this.model.multiline, title: this.model.title,
            canEditTitle: this.model.newField, protect: this.value && this.value.isProtected });
        this.valueEl = this.$el.find('.details__field-value');
        this.valueEl.html(this.renderValue(this.value));
        this.labelEl = this.$el.find('.details__field-label');
        if (this.model.tip) {
            this.tip = typeof this.model.tip === 'function' ? this.model.tip() : this.model.tip;
            if (this.tip) {
                this.valueEl.attr('title', this.tip);
                Tip.createTip(this.valueEl);
            }
        }
        return this;
    },

    remove: function() {
        if (this.tip) {
            Tip.hideTip(this.valueEl);
        }
        Backbone.View.prototype.remove.apply(this, arguments);
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
            var textValue = this.value && this.value.isProtected ? this.value.getText() : this.getEditValue(this.value);
            if (!textValue) {
                return;
            }
            CopyPaste.createHiddenInput(textValue, box);
            // CopyPaste.copy(); // maybe Apple will ever support this?
            return;
        }
        var copyRes;
        if (field) {
            var value = this.value || '';
            if (value && value.isProtected) {
                var text = value.getText();
                if (!text) {
                    return;
                }
                if (!CopyPaste.simpleCopy) {
                    CopyPaste.createHiddenInput(text);
                }
                copyRes = CopyPaste.copy(text);
                if (copyRes) {
                    this.trigger('copy', { source: this, copyRes: copyRes });
                }
                return;
            }
        }
        if (!this.value) {
            return;
        }
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(this.valueEl[0]);
        selection.removeAllRanges();
        selection.addRange(range);
        copyRes = CopyPaste.copy(this.valueEl[0].innerText || this.valueEl.text());
        if (copyRes) {
            selection.removeAllRanges();
            this.trigger('copy', { source: this, copyRes: copyRes });
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
        var textEqual;
        if (this.value && this.value.isProtected) {
            textEqual = this.value.equals(newVal);
        } else if (newVal && newVal.isProtected) {
            textEqual = newVal.equals(this.value);
        } else {
            textEqual = _.isEqual(this.value, newVal);
        }
        var protectedEqual = (newVal && newVal.isProtected) === (this.value && this.value.isProtected);
        var nameChanged = extra && extra.newField;
        var arg;
        if (newVal !== undefined && (!textEqual || !protectedEqual || nameChanged)) {
            arg = { val: newVal, field: this.model.name };
            if (extra) {
                _.extend(arg, extra);
            }
        } else if (extra) {
            arg = extra;
        }
        if (arg) {
            this.triggerChange(arg);
        }
        this.valueEl.html(this.renderValue(this.value));
        this.$el.removeClass('details__field--edit');
    },

    triggerChange: function(arg) {
        arg.sender = this;
        this.trigger('change', arg);
    }
});

module.exports = FieldView;

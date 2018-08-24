const Backbone = require('backbone');
const CopyPaste = require('../../comp/copy-paste');
const Tip = require('../../util/tip');

const FieldView = Backbone.View.extend({
    template: require('templates/details/field.hbs'),

    events: {
        'click .details__field-label': 'fieldLabelClick',
        'click .details__field-value': 'fieldValueClick',
        'dragstart .details__field-label': 'fieldLabelDrag'
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
            Tip.hideTip(this.valueEl[0]);
        }
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    update: function() {
        if (typeof this.model.value === 'function') {
            const newVal = this.model.value();
            if (!_.isEqual(newVal, this.value) || (this.value && newVal && this.value.toString() !== newVal.toString())) {
                this.render();
            }
        }
    },

    fieldLabelClick: function(e) {
        e.stopImmediatePropagation();
        if (this.preventCopy) {
            return;
        }
        const field = this.model.name;
        let copyRes;
        if (field) {
            const value = this.value || '';
            if (value && value.isProtected) {
                const text = value.getText();
                if (!text) {
                    return;
                }
                if (!CopyPaste.simpleCopy) {
                    CopyPaste.createHiddenInput(text);
                }
                copyRes = CopyPaste.copy(text);
                this.trigger('copy', { source: this, copyRes: copyRes });
                return;
            }
        }
        if (!this.value) {
            return;
        }
        const selection = window.getSelection();
        const range = document.createRange();
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
        const sel = window.getSelection().toString();
        if (!sel) {
            this.edit();
        }
    },

    fieldLabelDrag: function(e) {
        e.stopPropagation();
        if (!this.value) {
            return;
        }
        const dt = e.originalEvent.dataTransfer;
        const txtval = this.value.isProtected ? this.value.getText() : this.value;
        if (this.valueEl[0].tagName.toLowerCase() === 'a') {
            dt.setData('text/uri-list', txtval);
        }
        dt.setData('text/plain', txtval);
        dt.effectAllowed = 'copy';
    },

    edit: function() {
        if (this.readonly || this.editing) {
            return;
        }
        this.$el.addClass('details__field--edit');
        this.startEdit();
        this.editing = true;
        this.preventCopy = true;
        this.labelEl[0].setAttribute('draggable', 'false');
    },

    endEdit: function(newVal, extra) {
        if (!this.editing) {
            return;
        }
        this.editing = false;
        setTimeout(() => { this.preventCopy = false; }, 300);
        let textEqual;
        if (this.value && this.value.isProtected) {
            textEqual = this.value.equals(newVal);
        } else if (newVal && newVal.isProtected) {
            textEqual = newVal.equals(this.value);
        } else {
            textEqual = _.isEqual(this.value, newVal);
        }
        const protectedEqual = (newVal && newVal.isProtected) === (this.value && this.value.isProtected);
        const nameChanged = extra && extra.newField;
        let arg;
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
        this.labelEl[0].setAttribute('draggable', 'true');
    },

    triggerChange: function(arg) {
        arg.sender = this;
        this.trigger('change', arg);
    }
});

module.exports = FieldView;

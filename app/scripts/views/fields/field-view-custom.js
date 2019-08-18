const Backbone = require('backbone');
const FieldViewText = require('./field-view-text');
const FieldView = require('./field-view');
const Keys = require('../../const/keys');
const kdbxweb = require('kdbxweb');
const Tip = require('../../util/tip');
const Locale = require('../../util/locale');

const FieldViewCustom = FieldViewText.extend({
    events: {
        'mousedown .details__field-label': 'fieldLabelMousedown'
    },

    initialize() {
        _.extend(this.events, FieldViewText.prototype.events);
    },

    startEdit() {
        FieldViewText.prototype.startEdit.call(this);
        this.$el.addClass('details__field--can-edit-title');
        if (this.isProtected === undefined) {
            this.isProtected = this.value instanceof kdbxweb.ProtectedValue;
        }
        this.$el.toggleClass('details__field--protected', this.isProtected);
        $('<div/>')
            .addClass('details__field-value-btn details__field-value-btn-protect')
            .appendTo(this.valueEl)
            .mousedown(this.protectBtnClick.bind(this));
        let securityTipTitle = Locale.detLockField;
        if (this.isProtected) {
            securityTipTitle = Locale.detUnlockField;
        }
        const securityTip = new Tip($(this.valueEl).find('.details__field-value-btn'), {
            title: securityTipTitle
        });
        securityTip.init();
    },

    endEdit(newVal, extra) {
        this.$el.removeClass('details__field--can-edit-title');
        extra = _.extend({}, extra);
        if (this.model.titleChanged || this.model.newField) {
            extra.newField = this.model.title;
        }
        if (!this.editing) {
            return;
        }
        delete this.input;
        this.stopListening(Backbone, 'click', this.fieldValueBlur);
        if (typeof newVal === 'string') {
            if (this.isProtected) {
                newVal = kdbxweb.ProtectedValue.fromString(newVal);
            } else {
                newVal = $.trim(newVal);
            }
        }
        FieldView.prototype.endEdit.call(this, newVal, extra);
        if (this.model.titleChanged) {
            delete this.model.titleChanged;
        }
    },

    startEditTitle(emptyTitle) {
        const text = emptyTitle ? '' : this.model.title || '';
        this.labelInput = $('<input/>');
        this.labelEl.html('').append(this.labelInput);
        this.labelInput
            .attr({ autocomplete: 'off', spellcheck: 'false' })
            .val(text)
            .focus()[0]
            .setSelectionRange(text.length, text.length);
        this.labelInput.bind({
            input: this.fieldLabelInput.bind(this),
            keydown: this.fieldLabelKeydown.bind(this),
            keypress: this.fieldLabelInput.bind(this),
            mousedown: this.fieldLabelInputClick.bind(this),
            click: this.fieldLabelInputClick.bind(this)
        });
    },

    endEditTitle(newTitle) {
        if (newTitle && newTitle !== this.model.title) {
            this.model.title = newTitle;
            this.model.titleChanged = true;
        } else if (newTitle === '') {
            this.trigger('change', {
                field: '$' + this.model.title,
                val: ''
            });
        }
        this.$el.find('.details__field-label').text(this.model.title);
        delete this.labelInput;
        if (this.editing && this.input) {
            this.input.focus();
        }
    },

    fieldLabelClick(e) {
        e.stopImmediatePropagation();
        if (this.model.newField) {
            this.startEditTitle(true);
        } else if (this.editing) {
            this.startEditTitle();
        } else {
            FieldViewText.prototype.fieldLabelClick.call(this, e);
        }
    },

    fieldLabelMousedown(e) {
        if (this.editing) {
            e.stopPropagation();
        }
    },

    fieldValueBlur() {
        if (this.labelInput) {
            this.endEditTitle(this.labelInput.val());
        }
        if (this.input) {
            this.endEdit(this.input.val());
        }
    },

    fieldLabelInput(e) {
        e.stopPropagation();
    },

    fieldLabelInputClick(e) {
        e.stopPropagation();
    },

    fieldLabelKeydown(e) {
        e.stopPropagation();
        const code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            this.endEditTitle(e.target.value);
        } else if (code === Keys.DOM_VK_ESCAPE) {
            this.endEditTitle();
        } else if (code === Keys.DOM_VK_TAB) {
            e.preventDefault();
            this.endEditTitle(e.target.value);
        }
    },

    fieldValueInputClick() {
        if (this.labelInput) {
            this.endEditTitle(this.labelInput.val());
        }
        FieldViewText.prototype.fieldValueInputClick.call(this);
    },

    protectBtnClick(e) {
        e.stopPropagation();
        this.isProtected = !this.isProtected;
        this.$el.toggleClass('details__field--protected', this.isProtected);
        if (this.labelInput) {
            this.endEditTitle(this.labelInput.val());
        }
        this.setTimeout(function() {
            this.input.focus();
        });
    }
});

module.exports = FieldViewCustom;

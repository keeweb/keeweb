import * as kdbxweb from 'kdbxweb';
import { Keys } from 'const/keys';
import { Locale } from 'util/locale';
import { Tip } from 'util/ui/tip';
import { FieldView } from 'views/fields/field-view';
import { FieldViewText } from 'views/fields/field-view-text';

class FieldViewCustom extends FieldViewText {
    constructor(model, options) {
        super(model, options);
        this.events = {
            ...this.events,
            'mousedown .details__field-label': 'fieldLabelMousedown'
        };
    }

    startEdit() {
        super.startEdit();
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
    }

    endEdit(newVal, extra) {
        this.$el.removeClass('details__field--can-edit-title');
        extra = { ...extra };
        if (this.model.titleChanged) {
            extra.newField = this.model.title;
        }
        if (!this.editing) {
            return;
        }
        delete this.input;
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
    }

    startEditTitle(emptyTitle) {
        const text = emptyTitle ? '' : this.model.title || '';
        this.labelInput = $('<input/>');
        this.labelEl.empty().append(this.labelInput);
        this.labelInput
            .attr({ autocomplete: 'off', spellcheck: 'false' })
            .val(text)
            .trigger('focus')[0]
            .setSelectionRange(text.length, text.length);
        this.labelInput.bind({
            input: this.fieldLabelInput.bind(this),
            keydown: this.fieldLabelKeydown.bind(this),
            keyup: this.fieldLabelKeyup.bind(this),
            keypress: this.fieldLabelInput.bind(this),
            mousedown: this.fieldLabelInputClick.bind(this),
            click: this.fieldLabelInputClick.bind(this)
        });
    }

    endEditTitle(newTitle) {
        if (newTitle && newTitle !== this.model.title) {
            this.model.title = newTitle;
            this.model.titleChanged = true;
        } else if (newTitle === '') {
            this.emit('change', {
                field: '$' + this.model.title,
                val: ''
            });
        }
        this.$el.find('.details__field-label').text(this.model.title);
        delete this.labelInput;
        if (this.editing && this.input) {
            this.input.trigger('focus');
        }
    }

    fieldLabelClick(e) {
        e.stopImmediatePropagation();

        if (this.model.newField) {
            this.startEditTitle(true);
        } else if (this.editing) {
            this.startEditTitle();
        } else {
            super.fieldLabelClick.call(this, e);
        }
    }

    fieldLabelMousedown(e) {
        if (this.editing) {
            e.stopPropagation();
        }
    }

    fieldValueBlur() {
        if (this.labelInput) {
            this.endEditTitle(this.labelInput.val());
        }
        if (this.input) {
            this.endEdit(this.input.val());
        }
    }

    fieldLabelInput(e) {
        e.stopPropagation();
    }

    fieldLabelInputClick(e) {
        e.stopPropagation();
    }

    fieldLabelKeydown(e) {
        e.stopPropagation();
        const code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_ESCAPE) {
            this.endEditTitle();
        } else if (code === Keys.DOM_VK_TAB) {
            e.preventDefault();
            this.endEditTitle(e.target.value);
        }
    }

    fieldLabelKeyup(e) {
        const code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            this.endEditTitle(e.target.value);
        }
    }

    fieldValueInputClick() {
        if (this.labelInput) {
            this.endEditTitle(this.labelInput.val());
        }
        super.fieldValueInputClick.call(this);
    }

    protectBtnClick(e) {
        e.stopPropagation();
        this.isProtected = !this.isProtected;
        this.$el.toggleClass('details__field--protected', this.isProtected);
        if (this.labelInput) {
            this.endEditTitle(this.labelInput.val());
        }
        setTimeout(() => this.input.trigger('focus'));
    }
}

export { FieldViewCustom };

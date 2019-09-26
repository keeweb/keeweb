import kdbxweb from 'kdbxweb';
import { View } from 'framework/views/view';
import { CopyPaste } from 'comp/browser/copy-paste';
import { Tip } from 'util/ui/tip';
import { isEqual } from 'util/fn';
import { Features } from 'util/features';
import { Locale } from 'util/locale';
import { AutoType } from 'auto-type';
import { DropdownView } from 'views/dropdown-view';
import template from 'templates/details/field.hbs';

class FieldView extends View {
    template = template;

    events = {
        'click .details__field-label': 'fieldLabelClick',
        'click .details__field-value': 'fieldValueClick',
        'dragstart .details__field-label': 'fieldLabelDrag',
        'click .details__field-options': 'fieldOptionsClick'
    };

    constructor(model, options) {
        super(model, options);
        this.once('remove', () => {
            if (this.tip) {
                Tip.hideTip(this.valueEl[0]);
            }
        });
    }

    render() {
        this.value = typeof this.model.value === 'function' ? this.model.value() : this.model.value;
        super.render({
            cls: this.cssClass,
            editable: !this.readonly,
            multiline: this.model.multiline,
            title: this.model.title,
            canEditTitle: this.model.newField,
            protect: this.value && this.value.isProtected,
            hasOptions: !Features.isMobile && this.hasOptions
        });
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
    }

    update() {
        if (typeof this.model.value === 'function') {
            const newVal = this.model.value();
            if (
                !isEqual(newVal, this.value) ||
                (this.value && newVal && this.value.toString() !== newVal.toString())
            ) {
                this.render();
            }
        }
    }

    fieldLabelClick(e) {
        e.stopImmediatePropagation();
        this.hideOptionsDropdown();
        if (this.preventCopy) {
            return;
        }
        this.copyValue();
    }

    copyValue() {
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
                this.emit('copy', { source: this, copyRes });
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
            this.emit('copy', { source: this, copyRes });
        }
    }

    fieldValueClick(e) {
        this.hideOptionsDropdown();
        if (['a', 'input', 'textarea'].indexOf(e.target.tagName.toLowerCase()) >= 0) {
            return;
        }
        const sel = window.getSelection().toString();
        if (!sel) {
            this.edit();
        }
    }

    fieldLabelDrag(e) {
        e.stopPropagation();
        this.hideOptionsDropdown();
        if (!this.value) {
            return;
        }
        const dt = e.dataTransfer;
        const txtval = this.value.isProtected ? this.value.getText() : this.value;
        if (this.valueEl[0].tagName.toLowerCase() === 'a') {
            dt.setData('text/uri-list', txtval);
        }
        dt.setData('text/plain', txtval);
        dt.effectAllowed = 'copy';
    }

    edit() {
        if (this.readonly || this.editing) {
            return;
        }
        this.$el.addClass('details__field--edit');
        this.startEdit();
        this.editing = true;
        this.preventCopy = true;
        this.labelEl[0].setAttribute('draggable', 'false');
    }

    endEdit(newVal, extra) {
        if (!this.editing) {
            return;
        }
        this.editing = false;
        setTimeout(() => {
            this.preventCopy = false;
        }, 300);
        let textEqual;
        if (this.value && this.value.isProtected) {
            textEqual = this.value.equals(newVal);
        } else if (newVal && newVal.isProtected) {
            textEqual = newVal.equals(this.value);
        } else {
            textEqual = isEqual(this.value, newVal);
        }
        const protectedEqual =
            (newVal && newVal.isProtected) === (this.value && this.value.isProtected);
        const nameChanged = extra && extra.newField;
        let arg;
        if (newVal !== undefined && (!textEqual || !protectedEqual || nameChanged)) {
            arg = { val: newVal, field: this.model.name };
            if (extra) {
                Object.assign(arg, extra);
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
    }

    triggerChange(arg) {
        arg.sender = this;
        this.emit('change', arg);
    }

    fieldOptionsClick(e) {
        if (this.views.optionsDropdown) {
            this.hideOptionsDropdown();
            return;
        }

        e.stopPropagation();

        const dropdownView = new DropdownView();

        this.listenTo(dropdownView, 'cancel', this.hideOptionsDropdown);
        this.listenTo(dropdownView, 'select', this.optionsDropdownSelect);

        const options = [];

        options.push({ value: 'copy', icon: 'copy', text: Locale.alertCopy });

        if (this.value instanceof kdbxweb.ProtectedValue) {
            if (this.valueEl.hasClass('details__field-value--revealed')) {
                options.push({ value: 'hide', icon: 'eye-slash', text: Locale.detHideField });
            } else {
                options.push({ value: 'reveal', icon: 'eye', text: Locale.detRevealField });
            }
        }

        if (AutoType.enabled && this.model.sequence) {
            options.push({ value: 'autotype', icon: 'keyboard-o', text: Locale.detAutoTypeField });
        }

        const rect = this.$el[0].getBoundingClientRect();
        const position = {
            top: rect.bottom,
            right: rect.right
        };

        dropdownView.render({
            position,
            options
        });

        this.views.optionsDropdown = dropdownView;
    }

    hideOptionsDropdown() {
        if (this.views.optionsDropdown) {
            this.views.optionsDropdown.remove();
            delete this.views.optionsDropdown;
        }
    }

    optionsDropdownSelect(e) {
        this.hideOptionsDropdown();
        switch (e.item) {
            case 'copy':
                this.copyValue();
                break;
            case 'reveal':
                this.revealValue();
                break;
            case 'hide':
                this.hideValue();
                break;
            case 'autotype':
                this.emit('autotype', { source: this });
                break;
        }
    }

    revealValue() {
        const valueHtml = this.value.getText();
        this.valueEl.addClass('details__field-value--revealed').html(valueHtml);
    }

    hideValue() {
        this.valueEl
            .removeClass('details__field-value--revealed')
            .html(this.renderValue(this.value));
    }
}

export { FieldView };

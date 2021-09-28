import * as kdbxweb from 'kdbxweb';
import { Events } from 'framework/events';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';
import { Features } from 'util/features';
import { MdToHtml } from 'util/formatting/md-to-html';
import { PasswordPresenter } from 'util/formatting/password-presenter';
import { Tip } from 'util/ui/tip';
import { FieldView } from 'views/fields/field-view';
import { GeneratorView } from 'views/generator-view';
import { escape } from 'util/fn';
import { AppSettingsModel } from 'models/app-settings-model';

class FieldViewText extends FieldView {
    hasOptions = true;

    constructor(model, options) {
        super(model, options);
        this.once('remove', () => this.stopBlurListener());
    }

    renderValue(value) {
        if (this.model.markdown && AppSettingsModel.useMarkdown) {
            if (value && value.isProtected) {
                value = value.getText();
            }
            const converted = MdToHtml.convert(value);
            if (converted.html) {
                return converted.html;
            }
            value = converted.text;
        }
        return value && value.isProtected
            ? PasswordPresenter.presentValueWithLineBreaks(value)
            : escape(value || '').replace(/\n/g, '<br/>');
    }

    getEditValue(value) {
        return value && value.isProtected ? value.getText() : value || '';
    }

    startEdit() {
        const text = this.getEditValue(this.value);
        const isProtected = !!(this.value && this.value.isProtected);
        this.$el.toggleClass('details__field--protected', isProtected);
        this.input = $(document.createElement(this.model.multiline ? 'textarea' : 'input'));
        this.valueEl.empty().append(this.input);
        this.input
            .attr({ autocomplete: 'off', spellcheck: 'false' })
            .val(text)
            .focus()[0]
            .setSelectionRange(text.length, text.length);
        this.input.bind({
            input: this.fieldValueInput.bind(this),
            keydown: this.fieldValueKeydown.bind(this),
            keypress: this.fieldValueInput.bind(this),
            click: this.fieldValueInputClick.bind(this),
            mousedown: this.fieldValueInputMouseDown.bind(this)
        });
        const fieldValueBlurBound = (e) => this.fieldValueBlur(e);
        Events.on('click', fieldValueBlurBound);
        this.stopBlurListener = () => Events.off('click', fieldValueBlurBound);
        this.listenTo(Events, 'main-window-will-close', this.externalEndEdit);
        this.listenTo(Events, 'before-user-idle', this.externalEndEdit);
        if (this.model.multiline) {
            this.setInputHeight();
        }
        if (Features.isMobile) {
            this.createMobileControls();
        } else {
            if (this.model.canGen) {
                $('<div/>')
                    .addClass('details__field-value-btn details__field-value-btn-gen')
                    .appendTo(this.valueEl)
                    .click(this.showGeneratorClick.bind(this))
                    .mousedown(this.showGenerator.bind(this));
            }
        }
        Tip.hideTip(this.valueEl[0]);
        Tip.hideTip(this.labelEl[0]);
    }

    createMobileControls() {
        this.mobileControls = {};
        ['cancel', 'apply'].forEach((action) => {
            this.mobileControls[action] = $('<div/>')
                .addClass('details__field-value-btn details__field-value-btn-' + action)
                .appendTo(this.labelEl)
                .data('action', action)
                .on({
                    mousedown: this.mobileFieldControlMouseDown.bind(this),
                    touchstart: this.mobileFieldControlTouchStart.bind(this),
                    touchend: this.mobileFieldControlTouchEnd.bind(this),
                    touchmove: this.mobileFieldControlTouchMove.bind(this)
                });
        });
    }

    showGeneratorClick(e) {
        e.stopPropagation();
        if (!this.gen) {
            this.input.focus();
        }
    }

    showGenerator() {
        if (this.gen) {
            this.hideGenerator();
        } else {
            const fieldRect = this.input[0].getBoundingClientRect();
            const shadowSpread = parseInt(this.input.css('--focus-shadow-spread')) || 0;
            const pos = { left: fieldRect.left };
            const top = fieldRect.bottom + shadowSpread;
            const windowHeight = document.documentElement.clientHeight;
            if (top > windowHeight / 2 && top > 200) {
                pos.bottom = windowHeight - fieldRect.top + shadowSpread;
            } else {
                pos.top = top;
            }
            this.gen = new GeneratorView({
                pos,
                password: this.value
            });
            this.gen.render();
            this.gen.once('remove', this.generatorClosed.bind(this));
            this.gen.once('result', this.generatorResult.bind(this));
        }
    }

    hideGenerator() {
        if (this.gen) {
            const gen = this.gen;
            delete this.gen;
            gen.remove();
        }
    }

    generatorClosed() {
        if (this.gen) {
            delete this.gen;
            this.endEdit();
        }
    }

    generatorResult(password) {
        if (this.gen) {
            delete this.gen;
            this.endEdit(password);
        }
    }

    setInputHeight() {
        const MinHeight = 18;
        this.input.height(MinHeight);
        let newHeight = this.input[0].scrollHeight;
        if (newHeight <= MinHeight) {
            newHeight = MinHeight;
        }
        this.input.height(newHeight);
    }

    fieldValueBlur() {
        if (!this.gen && this.input) {
            this.endEdit(this.input.val());
        }
    }

    fieldValueInput(e) {
        e.stopPropagation();
        if (this.model.multiline) {
            this.setInputHeight();
        }
    }

    fieldValueInputClick() {
        if (this.gen) {
            this.hideGenerator();
        }
    }

    fieldValueInputMouseDown(e) {
        e.stopPropagation();
    }

    fieldValueKeydown(e) {
        KeyHandler.reg();
        const code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            if (!this.model.multiline || (!e.altKey && !e.shiftKey && !e.ctrlKey)) {
                if (this.gen) {
                    e.target.value = this.gen.password;
                    this.hideGenerator();
                    return;
                }
                this.stopBlurListener();
                this.endEdit(e.target.value);
            }
        } else if (code === Keys.DOM_VK_ESCAPE) {
            this.stopBlurListener();
            this.endEdit();
        } else if (code === Keys.DOM_VK_TAB) {
            e.preventDefault();
            this.stopBlurListener();
            this.endEdit(e.target.value, { tab: { field: this.model.name, prev: e.shiftKey } });
        } else if (code === Keys.DOM_VK_G && e.metaKey) {
            e.preventDefault();
            this.showGenerator();
        } else if (code === Keys.DOM_VK_S && (e.metaKey || e.ctrlKey)) {
            this.stopBlurListener();
            this.endEdit(e.target.value);
            return;
        }
        e.stopPropagation();
    }

    externalEndEdit() {
        if (this.input) {
            this.endEdit(this.input.val());
        }
    }

    endEdit(newVal, extra) {
        if (this.gen) {
            this.hideGenerator();
        }
        if (!this.editing) {
            return;
        }
        delete this.input;
        if (this.mobileControls) {
            this.mobileControls.cancel.remove();
            this.mobileControls.apply.remove();
            delete this.mobileControls;
        }
        this.stopBlurListener();
        if (typeof newVal === 'string' && this.value instanceof kdbxweb.ProtectedValue) {
            newVal = kdbxweb.ProtectedValue.fromString(newVal);
        }
        if (typeof newVal === 'string') {
            newVal = $.trim(newVal);
        }
        super.endEdit(newVal, extra);
    }

    stopBlurListener() {}

    mobileFieldControlMouseDown(e) {
        e.stopPropagation();
        this.stopBlurListener();
        const action = $(e.target).data('action');
        if (action === 'apply') {
            this.endEdit(this.input.val());
        } else {
            this.endEdit();
        }
    }

    mobileFieldControlTouchStart(e) {
        this.$el.attr('active-mobile-action', $(e.target).data('action'));
    }

    mobileFieldControlTouchEnd(e) {
        const shouldExecute = this.$el.attr('active-mobile-action') === $(e.target).data('action');
        this.$el.removeAttr('active-mobile-action');
        if (shouldExecute) {
            this.mobileFieldControlMouseDown(e);
        }
    }

    mobileFieldControlTouchMove(e) {
        const touch = e.originalEvent.targetTouches[0];
        const rect = touch.target.getBoundingClientRect();
        const inside =
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom;
        if (inside) {
            this.$el.attr('active-mobile-action', $(e.target).data('action'));
        } else {
            this.$el.removeAttr('active-mobile-action');
        }
    }
}

export { FieldViewText };

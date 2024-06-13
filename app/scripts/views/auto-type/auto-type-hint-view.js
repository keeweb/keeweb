import { View } from 'framework/views/view';
import { Links } from 'const/links';
import { Timeouts } from 'const/timeouts';
import { Features } from 'util/features';
import template from 'templates/auto-type-hint.hbs';

class AutoTypeHintView extends View {
    parent = 'body';

    template = template;

    events = {};

    constructor(model) {
        super(model);
        this.input = model.input;
        this.bodyClick = this.bodyClick.bind(this);
        this.inputBlur = this.inputBlur.bind(this);
        $('body').on('click', this.bodyClick);
        this.input.addEventListener('blur', this.inputBlur);
        this.once('remove', () => {
            $('body').off('click', this.bodyClick);
            this.input.removeEventListener('blur', this.inputBlur);
        });
    }

    render() {
        super.render({
            cmd: Features.isMac ? 'command' : 'ctrl',
            hasCtrl: Features.isMac,
            link: Links.AutoType
        });
        const rect = this.input.getBoundingClientRect();
        this.$el.appendTo(document.body).css({
            left: rect.left,
            top: rect.bottom + 1,
            width: rect.width
        });
        const selfRect = this.$el[0].getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();
        if (selfRect.bottom > bodyRect.bottom) {
            this.$el.css('height', selfRect.height + bodyRect.bottom - selfRect.bottom - 1);
        }
    }

    bodyClick(e) {
        if (this.removeTimer) {
            clearTimeout(this.removeTimer);
            this.removeTimer = null;
        }
        if (e.target === this.input) {
            e.stopPropagation();
            return;
        }
        if ($.contains(this.$el[0], e.target) || e.target === this.$el[0]) {
            e.stopPropagation();
            if (e.target.tagName.toLowerCase() === 'a' && !e.target.href) {
                let text = $(e.target).text();
                if (text[0] !== '{') {
                    text = text.split(' ')[0];
                }
                this.insertText(text);
            }
            this.input.focus();
        } else {
            this.remove();
        }
    }

    inputBlur() {
        if (!this.removeTimer) {
            this.removeTimer = setTimeout(this.remove.bind(this), Timeouts.DropDownClickWait);
        }
    }

    insertText(text) {
        const pos = this.input.selectionEnd || this.input.value.length;
        this.input.value = this.input.value.slice(0, pos) + text + this.input.value.slice(pos);
        this.input.selectionStart = this.input.selectionEnd = pos + text.length;
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

export { AutoTypeHintView };

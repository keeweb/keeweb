import { View } from 'framework/views/view';
import { AutoType } from 'auto-type';
import { Shortcuts } from 'comp/app/shortcuts';
import { Locale } from 'util/locale';
import { AutoTypeHintView } from 'views/auto-type/auto-type-hint-view';
import template from 'templates/details/details-auto-type.hbs';

class DetailsAutoTypeView extends View {
    parent = '.details__body-after';

    template = template;

    events = {
        'focus #details__auto-type-sequence': 'seqFocus',
        'input #details__auto-type-sequence': 'seqInput',
        'keypress #details__auto-type-sequence': 'seqKeyPress',
        'keydown #details__auto-type-sequence': 'seqKeyDown',
        'change #details__auto-type-enabled': 'enabledChange',
        'change #details__auto-type-obfuscation': 'obfuscationChange'
    };

    render() {
        const detAutoTypeShortcutsDesc = Locale.detAutoTypeShortcutsDesc
            .replace('{}', Shortcuts.actionShortcutSymbol() + 'T')
            .replace('{}', Shortcuts.globalShortcutText('autoType'));
        super.render({
            enabled: this.model.getEffectiveEnableAutoType(),
            obfuscation: this.model.autoTypeObfuscation,
            sequence: this.model.autoTypeSequence,
            windows: this.model.autoTypeWindows,
            defaultSequence: this.model.group.getEffectiveAutoTypeSeq(),
            detAutoTypeShortcutsDesc
        });
    }

    seqInput(e) {
        const el = e.target;
        const seq = el.value.trim();
        AutoType.validate(this.model, seq, (err) => {
            $(el).toggleClass('input--error', !!err);
            if (!err) {
                this.model.setAutoTypeSeq(seq);
            }
        });
    }

    seqKeyPress(e) {
        e.stopPropagation();
    }

    seqKeyDown(e) {
        e.stopPropagation();
    }

    seqFocus(e) {
        if (!this.views.hint) {
            this.views.hint = new AutoTypeHintView({ input: e.target });
            this.views.hint.render();
            this.views.hint.on('remove', () => {
                delete this.views.hint;
            });
        }
    }

    enabledChange(e) {
        this.model.setEnableAutoType(e.target.checked);
    }

    obfuscationChange(e) {
        this.model.setAutoTypeObfuscation(e.target.checked);
    }
}

export { DetailsAutoTypeView };

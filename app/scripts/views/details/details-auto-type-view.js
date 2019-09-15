const Backbone = require('backbone');
const AutoTypeHintView = require('../auto-type-hint-view');
const Locale = require('../../util/locale');
const Shortcuts = require('../../comp/app/shortcuts');
const AutoType = require('../../auto-type');

const DetailsAutoTypeView = Backbone.View.extend({
    template: require('templates/details/details-auto-type.hbs'),

    events: {
        'focus #details__auto-type-sequence': 'seqFocus',
        'input #details__auto-type-sequence': 'seqInput',
        'keypress #details__auto-type-sequence': 'seqKeyPress',
        'keydown #details__auto-type-sequence': 'seqKeyDown',
        'change #details__auto-type-enabled': 'enabledChange',
        'change #details__auto-type-obfuscation': 'obfuscationChange'
    },

    initialize() {
        this.views = {};
    },

    render() {
        const detAutoTypeShortcutsDesc = Locale.detAutoTypeShortcutsDesc
            .replace('{}', Shortcuts.actionShortcutSymbol() + 'T')
            .replace('{}', Shortcuts.globalShortcutText('autoType'));
        this.renderTemplate({
            enabled: this.model.getEffectiveEnableAutoType(),
            obfuscation: this.model.autoTypeObfuscation,
            sequence: this.model.autoTypeSequence,
            windows: this.model.autoTypeWindows,
            defaultSequence: this.model.group.getEffectiveAutoTypeSeq(),
            detAutoTypeShortcutsDesc
        });
        return this;
    },

    seqInput(e) {
        const el = e.target;
        const seq = $.trim(el.value);
        AutoType.validate(this.model, seq, err => {
            $(el).toggleClass('input--error', !!err);
            if (!err) {
                this.model.setAutoTypeSeq(seq);
            }
        });
    },

    seqKeyPress(e) {
        e.stopPropagation();
    },

    seqKeyDown(e) {
        e.stopPropagation();
    },

    seqFocus(e) {
        if (!this.views.hint) {
            this.views.hint = new AutoTypeHintView({ input: e.target }).render();
            this.views.hint.on('remove', () => {
                delete this.views.hint;
            });
        }
    },

    enabledChange(e) {
        this.model.setEnableAutoType(e.target.checked);
    },

    obfuscationChange(e) {
        this.model.setAutoTypeObfuscation(e.target.checked);
    }
});

module.exports = DetailsAutoTypeView;

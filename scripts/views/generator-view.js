import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { GeneratorPresets } from 'comp/app/generator-presets';
import { CopyPaste } from 'comp/browser/copy-paste';
import { AppSettingsModel } from 'models/app-settings-model';
import { PasswordGenerator } from 'util/generators/password-generator';
import { PasswordPresenter } from 'util/formatting/password-presenter';
import { Locale } from 'util/locale';
import { Tip } from 'util/ui/tip';
import template from 'templates/generator.hbs';

class GeneratorView extends View {
    parent = 'body';

    template = template;

    events = {
        'click': 'click',
        'mousedown .gen__length-range': 'generate',
        'input .gen__length-range': 'lengthChange',
        'change .gen__length-range': 'lengthChange',
        'change .gen__check input[type=checkbox]': 'checkChange',
        'change .gen__check-hide': 'hideChange',
        'click .gen__btn-ok': 'btnOkClick',
        'change .gen__sel-tpl': 'presetChange',
        'click .gen__btn-refresh': 'newPass'
    };

    valuesMap = [
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        22,
        24,
        26,
        28,
        30,
        32,
        48,
        64
    ];

    presets = null;
    preset = null;

    constructor(model) {
        super(model);
        this.createPresets();
        const preset = this.preset;
        this.gen = { ...this.presets.find((pr) => pr.name === preset) };
        this.hide = AppSettingsModel.generatorHidePassword;
        $('body').one('click', this.remove.bind(this));
        this.listenTo(Events, 'lock-workspace', this.remove.bind(this));
    }

    render() {
        const canCopy = document.queryCommandSupported('copy');
        const btnTitle = this.model.copy
            ? canCopy
                ? Locale.alertCopy
                : Locale.alertClose
            : Locale.alertOk;
        super.render({
            btnTitle,
            showToggleButton: this.model.copy,
            opt: this.gen,
            hide: this.hide,
            presets: this.presets,
            preset: this.preset,
            showTemplateEditor: !this.model.noTemplateEditor
        });
        this.resultEl = this.$el.find('.gen__result');
        this.$el.css(this.model.pos);
        this.generate();
    }

    createPresets() {
        this.presets = GeneratorPresets.enabled;
        if (
            this.model.password &&
            (!this.model.password.isProtected || this.model.password.byteLength)
        ) {
            const derivedPreset = { name: 'Derived', title: Locale.genPresetDerived };
            Object.assign(derivedPreset, PasswordGenerator.deriveOpts(this.model.password));
            this.presets.splice(0, 0, derivedPreset);
            this.preset = 'Derived';
        } else {
            const defaultPreset = this.presets.filter((p) => p.default)[0] || this.presets[0];
            this.preset = defaultPreset.name;
        }
        this.presets.forEach((pr) => {
            pr.pseudoLength = this.lengthToPseudoValue(pr.length);
        });
    }

    lengthToPseudoValue(length) {
        for (let ix = 0; ix < this.valuesMap.length; ix++) {
            if (this.valuesMap[ix] >= length) {
                return ix;
            }
        }
        return this.valuesMap.length - 1;
    }

    showPassword() {
        if (this.hide && !this.model.copy) {
            this.resultEl.text(PasswordPresenter.present(this.password.length));
        } else {
            this.resultEl.text(this.password);
        }
    }

    click(e) {
        e.stopPropagation();
    }

    lengthChange(e) {
        const val = this.valuesMap[e.target.value];
        if (val !== this.gen.length) {
            this.gen.length = val;
            this.$el.find('.gen__length-range-val').text(val);
            this.optionChanged('length');
            this.generate();
        }
    }

    checkChange(e) {
        const id = $(e.target).data('id');
        if (id) {
            this.gen[id] = e.target.checked;
        }
        this.optionChanged(id);
        this.generate();
    }

    optionChanged(option) {
        if (
            this.preset === 'Custom' ||
            (this.preset === 'Pronounceable' && ['length', 'lower', 'upper'].indexOf(option) >= 0)
        ) {
            return;
        }
        this.preset = this.gen.name = 'Custom';
        this.$el.find('.gen__sel-tpl').val('');
    }

    generate() {
        this.password = PasswordGenerator.generate(this.gen);
        this.showPassword();
        const isLong = this.password.length > 32;
        this.resultEl.toggleClass('gen__result--long-pass', isLong);
    }

    hideChange(e) {
        this.hide = e.target.checked;
        AppSettingsModel.generatorHidePassword = this.hide;
        const label = this.$el.find('.gen__check-hide-label');
        Tip.updateTip(label[0], { title: this.hide ? Locale.genShowPass : Locale.genHidePass });
        this.showPassword();
    }

    btnOkClick() {
        if (this.model.copy) {
            if (!CopyPaste.simpleCopy) {
                CopyPaste.createHiddenInput(this.password);
            }
            CopyPaste.copy(this.password);
        }
        this.emit('result', this.password);
        this.remove();
    }

    presetChange(e) {
        const name = e.target.value;
        if (name === '...') {
            Events.emit('edit-generator-presets');
            this.remove();
            return;
        }
        this.preset = name;
        const preset = this.presets.find((t) => t.name === name);
        this.gen = { ...preset };
        this.render();
    }

    newPass() {
        this.generate();
    }
}

export { GeneratorView };

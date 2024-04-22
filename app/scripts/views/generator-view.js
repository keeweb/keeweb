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
    spacesLenMin = 5;

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
        3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32, 48,
        64, 128
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
            spaces: false,
            presets: this.presets,
            preset: this.preset,
            presetLC: this.preset.toLowerCase(),
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

        this.presetLC = this.preset.toLowerCase();
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

    setDisabledElements() {
        // disabled elements / checkboxes greyed out
        if (this.gen.disabledElements && this.gen.disabledElements.length) {
            for (let i = 0; i < this.gen.disabledElements.length; i++) {
                const elementName = this.gen.disabledElements[i];
                this.gen[elementName] = false;
                this.$el.find('.checkbox-' + elementName).attr('disabled', 'disabled');
            }
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

            // dont allow spaces unless password is a certain length
            if (this.presetLC !== 'passphrase') {
                const cboxSpaces = document.getElementsByClassName('checkbox-spaces');
                if (this.gen.length > this.spacesLenMin) {
                    this.$el.find('.checkbox-spaces').removeAttr('disabled');
                    if (cboxSpaces.item(0).checked) {
                        this.gen.spaces = true; // force spaces to be enabled
                    }
                } else {
                    this.$el.find('.checkbox-spaces').attr('disabled', 'disabled');
                    cboxSpaces.item(0).checked = false;
                    this.gen.spaces = false; // force spaces to be disabled
                }
            }
            this.generate();
        }
    }

    checkChange(e) {
        const id = $(e.target).data('id');
        if (id) {
            this.gen[id] = e.target.checked;
        }

        if (this.presetLC === 'passphrase') {
            const cbSpecial = document.getElementsByClassName('checkbox-special');
            const cbHigh = document.getElementsByClassName('checkbox-high');

            if (id === 'special') {
                // upper checked -> uncheck and re-enable lower
                if (cbSpecial.item(0).checked) {
                    this.$el.find('.checkbox-high').attr('disabled', 'disabled');
                    cbHigh.item(0).checked = false;
                    this.gen.high = false;
                } else {
                    this.$el.find('.checkbox-high').removeAttr('disabled');
                }
            } else if (id === 'high') {
                // upper checked -> uncheck and re-enable lower
                if (cbHigh.item(0).checked) {
                    this.$el.find('.checkbox-special').attr('disabled', 'disabled');
                    cbSpecial.item(0).checked = false;
                    this.gen.special = false;
                } else {
                    this.$el.find('.checkbox-special').removeAttr('disabled');
                }
            }
        }

        this.optionChanged(id);
        this.generate();
    }

    optionChanged(option) {
        // certain presets should allow users to check custom options.
        // if a preset is not in the list, checking any checkbox will set preset to 'custom'
        if (
            this.presetLC === 'custom' ||
            (this.presetLC === 'passphrase' &&
                ['length', 'lower', 'upper', 'digits', 'high', 'special', 'spaces'].indexOf(
                    option
                ) >= 0) ||
            ((this.presetLC === 'hash128' ||
                this.presetLC === 'hash256' ||
                this.presetLC === 'hash512') &&
                ['lower', 'upper'].indexOf(option) >= 0) ||
            (this.presetLC === 'uuid' && ['lower', 'upper', 'digits'].indexOf(option) >= 0) ||
            (this.presetLC === 'pronounceable' && ['length', 'lower', 'upper'].indexOf(option) >= 0)
        ) {
            return;
        }

        this.preset = this.gen.name = 'Custom';
        this.$el.find('.gen__sel-tpl').val('');
    }

    generate() {
        this.password = PasswordGenerator.generate(this.gen);
        this.setDisabledElements();
        this.showPassword();

        // disable spaces checkif if password is below minimum
        if (this.gen.length < this.spacesLenMin && this.presetLC !== 'passphrase') {
            this.$el.find('.checkbox-spaces').attr('disabled', 'disabled');
            const cboxSpaces = document.getElementsByClassName('checkbox-spaces');
            cboxSpaces.item(0).checked = false;
            this.gen.spaces = false; // force spaces to be disabled
        }

        this.resultEl.removeClass('__wrap');
        this.resultEl.removeClass('__nowrap');

        this.setInputHeight();

        // password vs passphrase word wrapping
        this.resultEl.toggleClass(this.presetLC === 'passphrase' ? '__nowrap' : '__wrap');
    }

    hideChange(e) {
        this.hide = e.target.checked;
        AppSettingsModel.generatorHidePassword = this.hide;
        const label = this.$el.find('.gen__check-hide-label');
        Tip.updateTip(label[0], { title: this.hide ? Locale.genShowPass : Locale.genHidePass });
        this.showPassword();

        /*
            if user clicks 'hide password' button while on passphrase, the dots need
            to wrap. otherwise they go off-screen
        */

        if (this.hide) {
            this.resultEl.toggleClass('__pass-hidden');
        } else {
            this.resultEl.removeClass('__pass-hidden');
        }
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
        this.presetLC = this.preset.toLowerCase();
        const preset = this.presets.find((t) => t.name === name);
        this.gen = { ...preset };
        this.render();

        /*
            if user clicks 'hide password' button while on passphrase, the dots need
            to wrap. otherwise they go off-screen.

            check if user changed to passphrase preset and set wrapping
        */

        if (this.presetLC === 'passphrase' && this.hide) {
            this.resultEl.toggleClass('__pass-hidden');
        } else {
            this.resultEl.removeClass('__pass-hidden');
        }
    }

    setInputHeight() {
        const MinHeight = 10;
        this.resultEl.height(MinHeight);
        let newHeight = this.resultEl[0].scrollHeight;
        if (newHeight <= MinHeight) {
            newHeight = MinHeight;
        }

        if (newHeight > 130) {
            newHeight = 130;
        }

        this.resultEl.height(newHeight);
    }

    newPass() {
        this.generate();
    }
}

export { GeneratorView };

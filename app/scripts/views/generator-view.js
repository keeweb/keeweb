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
        'input .gen__length-range': 'rangeLengthChange',
        'change .gen__length-range': 'rangeLengthChange',
        'change .gen__check input[type=checkbox]': 'cboxOptionOnChange',
        'change .gen__check-hide': 'hideChange',
        'click .gen__btn-ok': 'btnOkOnClick',
        'click .gen__btn-generate': 'btnGenerateOnClick',
        'click .gen__btn-refresh': 'btnGenerateOnClick',
        'change .gen__sel-tpl': 'dropdownPresetOnChange',
        'input .gen__input-sep': 'txtSeparatorOnTextChange'
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
        const btnGenerate = Locale.alertGenerate;

        super.render({
            btnTitle,
            btnGenerate,
            showToggleButton: this.model.copy,
            opt: this.gen,
            hide: this.hide,
            spaces: false,
            separatorChar: AppSettingsModel.generatorWordSeparator || String.fromCharCode(32),
            presets: this.presets,
            preset: this.preset,
            presetId: this.preset.toLowerCase(),
            showTemplateEditor: !this.model.noTemplateEditor
        });

        this.resultEl = this.$el.find('.gen__result');
        this.$el.css(this.model.pos);
        this.generate();
    }

    /*
        Change Separator
        triggered when the separator character is changed in the 'generate password' ui.
    */

    txtSeparatorOnTextChange(e) {
        let value = e.target.value;
        if (!value) {
            value = '';
        }

        AppSettingsModel.generatorWordSeparator = value;
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

        /*
            present id is preset name, but lowercase chars, and spaces replaced by underscores; just to add conformity

                MAC Address     => mac_address
                Medium Length   => medium_length
        */

        this.presetId = this.preset.toLowerCase().replace(/ /g, '_');
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

    /*
        Show generated password in textfield
    */

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

    /*
        range > character length

        fired when user adjusts how long a password should be (in chars)
    */

    rangeLengthChange(e) {
        const val = this.valuesMap[e.target.value];
        if (val !== this.gen.length) {
            this.gen.length = val;
            this.$el.find('.gen__length-range-val').text(val);
            this.optionOnChange('length');

            /*
                if present is anything besides `passphrase`, don't add spaces
                unless password is a certain length
            */

            if (this.presetId !== 'passphrase') {
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

    /*
        Checkbox > Change Option

        fire action every time checkbox is toggled on/off
    */

    cboxOptionOnChange(e) {
        const id = $(e.target).data('id');
        if (id) {
            this.gen[id] = e.target.checked;
        }

        /*
            dropdown > preset > passphrase
        */

        if (this.presetId === 'passphrase') {
            const cboxOptSpecial = this.$el.find('.checkbox-special');
            const cboxOptHigh = this.$el.find('.checkbox-high');

            /*
                these rules ensure you can't check two specific settings at once.
                if the `special` character checkbox is checked, the characters for `high` are unchecked, vice versa.
            */

            if (id === 'special') {
                // if opt `special` enabled, disable opt `high`
                if (cboxOptSpecial.is(':checked')) {
                    this.$el.find('.checkbox-high').attr('disabled', 'disabled');
                    cboxOptHigh.prop('checked', false);
                    this.gen.high = false;
                } else {
                    this.$el.find('.checkbox-high').removeAttr('disabled');
                }
            } else if (id === 'high') {
                // if opt `high` enabled, disable opt `special`
                if (cboxOptHigh.is(':checked')) {
                    this.$el.find('.checkbox-special').attr('disabled', 'disabled');
                    cboxOptSpecial.prop('checked', false);
                    this.gen.special = false;
                } else {
                    this.$el.find('.checkbox-special').removeAttr('disabled');
                }
            }
        }

        this.optionOnChange(id);
        this.render();
        this.generate();
    }

    /*
        option > on change

        fired when an option checkbox is changed
        certain presets should allow users to check custom options.
        if a preset is not in the list, checking any checkbox will set preset to 'custom'
    */

    optionOnChange(option) {
        if (
            this.presetId === 'custom' ||
            (this.presetId === 'passphrase' &&
                ['length', 'lower', 'upper', 'digits', 'high', 'special', 'separator'].indexOf(
                    option
                ) >= 0) ||
            ((this.presetId === 'hash128' ||
                this.presetId === 'hash256' ||
                this.presetId === 'hash512') &&
                ['lower', 'upper'].indexOf(option) >= 0) ||
            (this.presetId === 'uuid' && ['lower', 'upper', 'digits'].indexOf(option) >= 0) ||
            (this.presetId === 'pronounceable' && ['length', 'lower', 'upper'].indexOf(option) >= 0)
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

        // disable spaces check if if password is below minimum
        if (this.gen.length < this.spacesLenMin && this.presetId !== 'passphrase') {
            this.$el.find('.checkbox-spaces').attr('disabled', 'disabled');
            const cboxSpaces = document.getElementsByClassName('checkbox-spaces');
            cboxSpaces.item(0).checked = false;
            this.gen.spaces = false; // force spaces to be disabled
        }

        this.resultEl.removeClass('__wrap');
        this.resultEl.removeClass('__nowrap');

        this.setInputHeight();

        // password vs passphrase word wrapping
        this.resultEl.toggleClass(this.presetId === 'passphrase' ? '__nowrap' : '__wrap');
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

    /*
        button > ok / copy

        fired when copy button pressed
    */

    btnOkOnClick() {
        if (this.model.copy) {
            if (!CopyPaste.simpleCopy) {
                CopyPaste.createHiddenInput(this.password);
            }
            CopyPaste.copy(this.password);
        }

        this.emit('result', this.password);
        this.remove();
    }

    /*
        button > generate

        fired when requesting new password to be generated
    */

    btnGenerateOnClick() {
        this.generate();
    }

    /*
        dropdown > presets

        Fired when present in dropdown is changed
    */

    dropdownPresetOnChange(e) {
        const name = e.target.value;
        if (name === '...') {
            Events.emit('edit-generator-presets');
            this.remove();
            return;
        }

        this.preset = name;
        this.presetId = this.preset.toLowerCase();
        const preset = this.presets.find((t) => t.name === name);
        this.gen = { ...preset };
        this.render();

        /*
            if user clicks 'hide password' button while on passphrase, the dots need
            to wrap. otherwise they go off-screen.

            check if user changed to passphrase preset and set wrapping
        */

        if (this.presetId === 'passphrase' && this.hide) {
            this.resultEl.toggleClass('__pass-hidden');
        } else {
            this.resultEl.removeClass('__pass-hidden');
        }
    }

    setInputHeight() {
        const MinHeight = 10;
        this.resultEl.height(MinHeight);
        let newHeight = this.resultEl[0].scrollHeight - 18;
        if (newHeight <= MinHeight) {
            newHeight = MinHeight;
        }

        if (newHeight > 130) {
            newHeight = 130;
        }

        this.resultEl.height(newHeight);
    }
}

export { GeneratorView };

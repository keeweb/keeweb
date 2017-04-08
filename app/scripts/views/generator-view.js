const Backbone = require('backbone');
const PasswordGenerator = require('../util/password-generator');
const CopyPaste = require('../comp/copy-paste');
const GeneratorPresets = require('../comp/generator-presets');
const Locale = require('../util/locale');

const GeneratorView = Backbone.View.extend({
    el: 'body',

    template: require('templates/generator.hbs'),

    events: {
        'click': 'click',
        'mousedown .gen__length-range': 'generate',
        'mousemove .gen__length-range': 'lengthMouseMove',
        'input .gen__length-range': 'lengthChange',
        'change .gen__length-range': 'lengthChange',
        'change .gen__check input[type=checkbox]': 'checkChange',
        'click .gen__btn-ok': 'btnOkClick',
        'change .gen__sel-tpl': 'presetChange',
        'click .gen__btn-refresh': 'newPass'
    },

    valuesMap: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32, 48, 64],

    presets: null,
    preset: null,

    initialize: function () {
        this.createPresets();
        const preset = this.preset;
        this.gen = _.clone(_.find(this.presets, pr => pr.name === preset));
        $('body').one('click', this.remove.bind(this));
        this.listenTo(Backbone, 'lock-workspace', this.remove.bind(this));
    },

    render: function() {
        const canCopy = document.queryCommandSupported('copy');
        const btnTitle = this.model.copy ? canCopy ? Locale.alertCopy : Locale.alertClose : Locale.alertOk;
        this.renderTemplate({ btnTitle: btnTitle, opt: this.gen, presets: this.presets, preset: this.preset });
        this.resultEl = this.$el.find('.gen__result');
        this.$el.css(this.model.pos);
        this.generate();
        return this;
    },

    createPresets: function() {
        this.presets = GeneratorPresets.enabled;
        if (this.model.password && (!this.model.password.isProtected || this.model.password.byteLength)) {
            const derivedPreset = { name: 'Derived', title: Locale.genPresetDerived };
            _.extend(derivedPreset, PasswordGenerator.deriveOpts(this.model.password));
            this.presets.splice(0, 0, derivedPreset);
            this.preset = 'Derived';
        } else {
            const defaultPreset = this.presets.filter(p => p.default)[0] || this.presets[0];
            this.preset = defaultPreset.name;
        }
        this.presets.forEach(function(pr) {
            pr.pseudoLength = this.lengthToPseudoValue(pr.length);
        }, this);
    },

    lengthToPseudoValue: function(length) {
        for (let ix = 0; ix < this.valuesMap.length; ix++) {
            if (this.valuesMap[ix] >= length) {
                return ix;
            }
        }
        return this.valuesMap.length - 1;
    },

    click: function(e) {
        e.stopPropagation();
    },

    lengthChange: function(e) {
        const val = this.valuesMap[e.target.value];
        if (val !== this.gen.length) {
            this.gen.length = val;
            this.$el.find('.gen__length-range-val').html(val);
            this.optionChanged('length');
            this.generate();
        }
    },

    checkChange: function(e) {
        const id = $(e.target).data('id');
        if (id) {
            this.gen[id] = e.target.checked;
        }
        this.optionChanged(id);
        this.generate();
    },

    optionChanged: function(option) {
        if (this.preset === 'Custom' ||
            this.preset === 'Pronounceable' && ['length', 'lower', 'upper'].indexOf(option) >= 0) {
            return;
        }
        this.preset = this.gen.name = 'Custom';
        this.$el.find('.gen__sel-tpl').val('');
    },

    generate: function() {
        this.password = PasswordGenerator.generate(this.gen);
        this.resultEl.text(this.password);
        const isLong = this.password.length > 32;
        this.resultEl.toggleClass('gen__result--long-pass', isLong);
    },

    btnOkClick: function() {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(this.resultEl[0]);
        selection.removeAllRanges();
        selection.addRange(range);
        CopyPaste.copy(this.password);
        this.trigger('result', this.password);
        this.remove();
    },

    presetChange: function(e) {
        const name = e.target.value;
        if (name === '...') {
            Backbone.trigger('edit-generator-presets');
            this.remove();
            return;
        }
        this.preset = name;
        const preset = _.find(this.presets, t => t.name === name);
        this.gen = _.clone(preset);
        this.render();
    },

    newPass: function() {
        this.generate();
    }
});

module.exports = GeneratorView;

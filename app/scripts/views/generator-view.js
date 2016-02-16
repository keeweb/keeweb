'use strict';

var Backbone = require('backbone'),
    PasswordGenerator = require('../util/password-generator'),
    CopyPaste = require('../comp/copy-paste'),
    Locale = require('../util/locale');

var GeneratorView = Backbone.View.extend({
    el: 'body',

    template: require('templates/generator.hbs'),

    events: {
        'click': 'click',
        'mousedown .gen__length-range': 'generate',
        'mousemove .gen__length-range': 'lengthChange',
        'change .gen__length-range': 'lengthChange',
        'change .gen__check input[type=checkbox]': 'checkChange',
        'click .gen__btn-ok': 'btnOkClick',
        'change .gen__sel-tpl': 'templateChange'
    },

    valuesMap: [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,22,24,26,28,30,32,48,64],

    presets: null,
    preset: null,

    initialize: function () {
        this.createPresets();
        var preset = this.preset;
        this.gen = _.clone(_.find(this.presets, function(pr) { return pr.name === preset; }));
        this.gen = _.clone(this.presets[1]);
        $('body').one('click', this.remove.bind(this));
        this.listenTo(Backbone, 'lock-workspace', this.remove.bind(this));
    },

    render: function() {
        var canCopy = document.queryCommandSupported('copy');
        var btnTitle = this.model.copy ? canCopy ? Locale.alertCopy : Locale.alertClose : Locale.alertOk;
        this.renderTemplate({ btnTitle: btnTitle, opt: this.gen, presets: this.presets, preset: this.preset });
        this.resultEl = this.$el.find('.gen__result');
        this.$el.css(this.model.pos);
        this.generate();
        return this;
    },

    createPresets: function() {
        this.presets = [
            { name: 'Default', length: 16, upper: true, lower: true, digits: true },
            { name: 'Pronounceable', length: 10, lower: true, upper: true },
            { name: 'Med', length: 16, upper: true, lower: true, digits: true, special: true, brackets: true, ambiguous: true },
            { name: 'Long', length: 32, upper: true, lower: true, digits: true },
            { name: 'Pin4', length: 4, digits: true },
            { name: 'Mac', length: 17, upper: true, digits: true, special: true },
            { name: 'Hash128', length: 32, lower: true, digits: true },
            { name: 'Hash256', length: 64, lower: true, digits: true }
        ];
        if (this.model.password) {
            var derivedPreset = { name: 'Derived' };
            _.extend(derivedPreset, PasswordGenerator.deriveOpts(this.model.password));
            for (var i = 0; i < this.valuesMap.length; i++) {
                if (this.valuesMap[i] >= derivedPreset.length) {
                    derivedPreset.length = this.valuesMap[i];
                    break;
                }
            }
            if (derivedPreset.length > this.valuesMap[this.valuesMap.length - 1]) {
                derivedPreset.length = this.valuesMap[this.valuesMap.length - 1];
            }
            this.presets.splice(1, 0, derivedPreset);
            this.preset = 'Derived';
        } else {
            this.preset = 'Default';
        }
        this.presets.forEach(function(pr) {
            pr.pseudoLength = this.valuesMap.indexOf(pr.length);
            pr.title = Locale['genPreset' + pr.name];
        }, this);
    },

    click: function(e) {
        e.stopPropagation();
    },

    lengthChange: function(e) {
        var val = this.valuesMap[e.target.value];
        if (val !== this.gen.length) {
            this.gen.length = val;
            this.$el.find('.gen__length-range-val').html(val);
            this.optionChanged('length');
            this.generate();
        }
    },

    checkChange: function(e) {
        var id = $(e.target).data('id');
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
        var isLong = this.password.length > 32;
        this.resultEl.toggleClass('gen__result--long-pass', isLong);
    },

    btnOkClick: function() {
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(this.resultEl[0]);
        selection.removeAllRanges();
        selection.addRange(range);
        CopyPaste.copy(this.password);
        this.trigger('result', this.password);
        this.remove();
    },

    templateChange: function(e) {
        var name = e.target.value;
        this.preset = name;
        var preset = _.find(this.presets, function(t) { return t.name === name; });
        this.gen = _.clone(preset);
        this.render();
    }
});

module.exports = GeneratorView;

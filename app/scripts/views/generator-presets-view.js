'use strict';

const Backbone = require('backbone');
const Locale = require('../util/locale');

let GeneratorPresetsView = Backbone.View.extend({
    template: require('templates/generator-presets.hbs'),

    events: {
        'click .back-button': 'returnToApp',
        'change .gen-ps__list': 'changePreset',
        'click .gen-ps__btn-create': 'createPreset',
        'click .gen-ps__btn-delete': 'deletePreset',
        'input #gen-ps__field-name': 'changeName'
    },

    selected: null,

    initialize: function() {
        this.appModel = this.model;
    },

    render: function() {
        let presets = this.appModel.settings.get('generatorPresets') || [];
        if (!this.selected || presets.indexOf(this.selected) < 0) {
            this.selected = presets[0];
        }
        this.renderTemplate({
            empty: !presets.length,
            presets: presets,
            selected: this.selected
        }, true);
        return this;
    },

    returnToApp: function() {
        Backbone.trigger('edit-generator-presets');
    },

    changePreset: function(e) {
        let id = e.target.value;
        let presets = this.appModel.settings.get('generatorPresets');
        this.selected = presets.filter(p => p.id === id)[0];
        this.render();
    },

    createPreset: function() {
        let presets = this.appModel.settings.get('generatorPresets') || [];
        let name;
        let id;
        for (let i = 1; ; i++) {
            let newName = Locale.genPsNew + ' ' + i;
            if (!presets.filter(p => p.name === newName).length) {
                name = newName;
                break;
            }
        }
        for (let i = 1; ; i++) {
            let newId = 'custom' + i;
            if (!presets.filter(p => p.id === newId).length) {
                id = newId;
                break;
            }
        }
        let preset = { id, name };
        presets.push(preset);
        this.selected = preset;
        this.appModel.settings.set('generatorPresets', presets);
        this.render();
    },

    deletePreset: function() {
        let presets = this.appModel.settings.get('generatorPresets');
        presets = presets.filter(p => p.id !== this.selected.id);
        this.appModel.settings.set('generatorPresets', presets.length ? presets : null);
        this.render();
    },

    changeName: function(e) {
        let name = $.trim(e.target.value);
        if (name && name !== this.selected.name) {
            let presets = this.appModel.settings.get('generatorPresets');
            let another = presets.filter(p => p.name.toLowerCase() === name.toLowerCase())[0];
            if (another) {
                $(e.target).addClass('input--error');
                return;
            } else {
                $(e.target).removeClass('input--error');
            }
            this.selected.name = name;
            this.appModel.settings.set('generatorPresets', presets);
            this.$el.find('.gen-ps__list option[selected]').text(name);
        }
    }
});

module.exports = GeneratorPresetsView;

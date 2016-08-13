'use strict';

const Backbone = require('backbone');

var GeneratorPresetsView = Backbone.View.extend({
    template: require('templates/generator-presets.hbs'),

    events: {
        'click .back-button': 'returnToApp'
    },

    initialize: function() {
        this.appModel = this.model;
    },

    render: function() {
        this.renderTemplate({
            //
        }, true);
        return this;
    },

    returnToApp: function() {
        Backbone.trigger('edit-generator-presets');
    }
});

module.exports = GeneratorPresetsView;

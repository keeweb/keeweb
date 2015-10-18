'use strict';

var Backbone = require('backbone');

var GeneratorView = Backbone.View.extend({
    el: 'body',

    template: require('templates/generator.html'),

    events: {
        'mousedown': 'mousedown'
    },

    initialize: function () {
        $('body').one('mousedown', this.remove.bind(this));
    },

    render: function() {
        this.renderTemplate();
        this.$el.css(this.model.pos);
    },

    mousedown: function(e) {
        e.stopPropagation();
    }
});

module.exports = GeneratorView;

'use strict';

var Backbone = require('backbone'),
    PasswordGenerator = require('../util/password-generator');

var GeneratorView = Backbone.View.extend({
    el: 'body',

    template: require('templates/generator.html'),

    events: {
        'click': 'click',
        'mousemove .gen__length-range': 'lengthChange',
        'change .gen__length-range': 'lengthChange',
        'change .gen__check input[type=checkbox]': 'checkChange'
    },

    initialize: function () {
        $('body').one('click', this.remove.bind(this));
        this.gen = _.clone(this.model.genOpts);
    },

    render: function() {
        this.renderTemplate(this.gen);
        this.$el.css(this.model.pos);
        this.generate();
    },

    click: function(e) {
        e.stopPropagation();
    },

    lengthChange: function(e) {
        var val = +e.target.value;
        if (val !== this.gen.length) {
            this.gen.length = val;
            this.$el.find('.gen__length-range-val').html(val);
            this.generate();
        }
    },

    checkChange: function(e) {
        var id = $(e.target).data('id');
        if (id) {
            this.gen[id] = e.target.checked;
        }
        this.generate();
    },

    generate: function() {
        this.$el.find('.gen__result').text(PasswordGenerator.generate(this.gen));
    }
});

module.exports = GeneratorView;

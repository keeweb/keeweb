'use strict';

var Backbone = require('backbone'),
    PasswordGenerator = require('../util/password-generator'),
    CopyPaste = require('../util/copy-paste');

var DefaultGenOpts = {
    length: 16, upper: true, lower: true, digits: true, special: false, brackets: false, high: false, ambiguous: false
};

var GeneratorView = Backbone.View.extend({
    el: 'body',

    template: require('templates/generator.html'),

    events: {
        'click': 'click',
        'mousedown .gen__length-range': 'generate',
        'mousemove .gen__length-range': 'lengthChange',
        'change .gen__length-range': 'lengthChange',
        'change .gen__check input[type=checkbox]': 'checkChange',
        'click .gen__btn-ok': 'btnOkClick'
    },

    initialize: function () {
        $('body').one('click', this.remove.bind(this));
        this.gen = _.clone(DefaultGenOpts);
    },

    render: function() {
        var canCopy = document.queryCommandSupported('copy');
        var btnTitle = this.model.copy ? canCopy ? 'Copy' : 'Close' : 'OK';
        this.renderTemplate({ btnTitle: btnTitle, opt: this.gen });
        this.resultEl = this.$el.find('.gen__result');
        this.$el.css(this.model.pos);
        this.generate();
        return this;
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
        this.password = PasswordGenerator.generate(this.gen);
        this.resultEl.text(this.password);
    },

    btnOkClick: function() {
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(this.resultEl[0]);
        selection.removeAllRanges();
        selection.addRange(range);
        CopyPaste.tryCopy();
        this.trigger('result', this.password);
        this.remove();
    }
});

module.exports = GeneratorView;

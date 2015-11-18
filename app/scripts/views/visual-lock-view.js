'use strict';

var Backbone = require('backbone');

var VisualLockView = Backbone.View.extend({
    template: require('templates/visual-lock.html'),
    el: '.app__body',

    events: {
    },

    initialize: function () {
    },

    render: function () {
        this.renderTemplate(this.model);
        return this;
    }
});

module.exports = VisualLockView;

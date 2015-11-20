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
        this.renderTemplate($.extend(this.model, { fileName: 'TODO' }));
        return this;
    }
});

module.exports = VisualLockView;

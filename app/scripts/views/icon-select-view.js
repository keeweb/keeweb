'use strict';

var Backbone = require('backbone'),
    IconMap = require('../const/icon-map');

var IconSelectView = Backbone.View.extend({
    template: require('templates/icon-select.html'),

    events: {
        'click .icon-select__icon': 'iconClick'
    },

    render: function() {
        this.renderTemplate({
            sel: this.model.iconId,
            icons: IconMap
        }, true);
        return this;
    },

    iconClick: function(e) {
        var iconId = +$(e.target).data('val');
        if (typeof iconId === 'number' && !isNaN(iconId)) {
            this.trigger('select', iconId);
        }
    }
});

module.exports = IconSelectView;

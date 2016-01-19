'use strict';

var Backbone = require('backbone');

var DropdownView = Backbone.View.extend({
    template: require('templates/dropdown.hbs'),

    events: {
        'click .dropdown__item': 'itemClick'
    },

    initialize: function () {
        this.bodyClick = this.bodyClick.bind(this);
        $('body').on('click', this.bodyClick);
    },

    render: function (config) {
        this.options = config.options;
        this.renderTemplate(config);
        this.$el.appendTo(document.body);
        var ownRect = this.$el[0].getBoundingClientRect();
        this.$el.css({ top: config.position.top, left: config.position.right - ownRect.right + ownRect.left });
        return this;
    },

    remove: function() {
        $('body').off('click', this.bodyClick);
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    bodyClick: function() {
        this.trigger('cancel');
    },

    itemClick: function(e) {
        e.stopPropagation();
        var selected = $(e.target).closest('.dropdown__item').data('value');
        this.trigger('select', { item: selected });
    }
});

module.exports = DropdownView;

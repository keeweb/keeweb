'use strict';

var Backbone = require('backbone'),
    Scrollable = require('../mixins/scrollable'),
    IconSelectView = require('./icon-select-view'),
    baron = require('baron');

var GrpView = Backbone.View.extend({
    template: require('templates/grp.html'),

    events: {
        'click .grp__icon': 'showIconsSelect',
        'click .grp__buttons-trash': 'moveToTrash',
        'blur #grp__field-title': 'titleBlur'
    },

    initialize: function() {
        this.views = {};
    },

    render: function() {
        this.removeSubView();
        if (this.model) {
            this.$el.html(this.template({
                title: this.model.get('title'),
                icon: this.model.get('icon') || 'folder',
                readonly: this.model.get('top')
            }));
            if (!this.model.get('title')) {
                this.$el.find('#grp__field-title').focus();
            }
        }
        this.scroll = baron({
            root: this.$el.find('.details__body')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0],
            $: Backbone.$
        });
        this.scroller = this.$el.find('.scroller');
        this.scrollerBar = this.$el.find('.scroller__bar');
        this.scrollerBarWrapper = this.$el.find('.scroller__bar-wrapper');
        this.pageResized();
        return this;
    },

    removeSubView: function() {
        if (this.views.sub) {
            this.views.sub.remove();
            delete this.views.sub;
        }
    },

    showGroup: function(group) {
        this.model = group;
        this.render();
    },

    titleBlur: function(e) {
        var title = $.trim(e.target.value);
        if (title) {
            if (!this.model.get('top') && e.target.value !== this.model.get('title')) {
                this.model.setName(e.target.value);
            }
        } else {
            if (this.model.isJustCreated) {
                this.model.removeWithoutHistory();
                Backbone.trigger('edit-group');
            } else {
                this.render();
            }
        }
    },

    showIconsSelect: function() {
        if (this.views.sub) {
            this.removeSubView();
        } else {
            var subView = new IconSelectView({el: this.$el.find('.grp__icons'), model: {iconId: this.model.get('iconId')}});
            this.listenTo(subView, 'select', this.iconSelected);
            subView.render();
            this.views.sub = subView;
        }
        this.pageResized();
    },

    iconSelected: function(iconId) {
        if (iconId !== this.model.get('iconId')) {
            this.model.setIcon(iconId);
        }
        this.render();
    },

    moveToTrash: function() {
        this.model.moveToTrash();
        Backbone.trigger('select-all');
    }
});

_.extend(GrpView.prototype, Scrollable);

module.exports = GrpView;

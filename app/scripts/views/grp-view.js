'use strict';

var Backbone = require('backbone'),
    Scrollable = require('../mixins/scrollable'),
    IconSelectView = require('./icon-select-view');

var GrpView = Backbone.View.extend({
    template: require('templates/grp.hbs'),

    events: {
        'click .grp__icon': 'showIconsSelect',
        'click .grp__buttons-trash': 'moveToTrash',
        'click .grp__back-button': 'returnToApp',
        'blur #grp__field-title': 'titleBlur',
        'change #grp__check-search': 'setEnableSearching'
    },

    initialize: function() {
        this.views = {};
    },

    render: function() {
        this.removeSubView();
        if (this.model) {
            this.renderTemplate({
                title: this.model.get('title'),
                icon: this.model.get('icon') || 'folder',
                customIcon: this.model.get('customIcon'),
                enableSearching: this.model.get('enableSearching') !== false,
                readonly: this.model.get('top')
            }, { plain: true });
            if (!this.model.get('title')) {
                this.$el.find('#grp__field-title').focus();
            }
        }
        this.createScroll({
            root: this.$el.find('.details__body')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
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
            var subView = new IconSelectView({
                el: this.$el.find('.grp__icons'),
                model: {
                    iconId: this.model.get('customIconId') || this.model.get('iconId'),
                    file: this.model.file
                }
            });
            this.listenTo(subView, 'select', this.iconSelected);
            subView.render();
            this.views.sub = subView;
        }
        this.pageResized();
    },

    iconSelected: function(sel) {
        if (sel.custom) {
            if (sel.id !== this.model.get('customIconId')) {
                this.model.setCustomIcon(sel.id);
            }
        } else if (sel.id !== this.model.get('iconId')) {
            this.model.setIcon(+sel.id);
        }
        this.render();
    },

    moveToTrash: function() {
        this.model.moveToTrash();
        Backbone.trigger('select-all');
    },

    setEnableSearching: function(e) {
        var enabled = e.target.checked;
        this.model.setEnableSearching(enabled);
    },

    returnToApp: function() {
        Backbone.trigger('edit-group');
    }
});

_.extend(GrpView.prototype, Scrollable);

module.exports = GrpView;

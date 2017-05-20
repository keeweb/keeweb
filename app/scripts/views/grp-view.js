const Backbone = require('backbone');
const Scrollable = require('../mixins/scrollable');
const IconSelectView = require('./icon-select-view');
const AutoTypeHintView = require('./auto-type-hint-view');
const AutoType = require('../auto-type');

const GrpView = Backbone.View.extend({
    template: require('templates/grp.hbs'),

    events: {
        'click .grp__icon': 'showIconsSelect',
        'click .grp__buttons-trash': 'moveToTrash',
        'click .back-button': 'returnToApp',
        'input #grp__field-title': 'changeTitle',
        'focus #grp__field-auto-type-seq': 'focusAutoTypeSeq',
        'input #grp__field-auto-type-seq': 'changeAutoTypeSeq',
        'change #grp__check-search': 'setEnableSearching',
        'change #grp__check-auto-type': 'setEnableAutoType'
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
                enableSearching: this.model.getEffectiveEnableSearching(),
                readonly: this.model.get('top'),
                canAutoType: AutoType.enabled,
                autoTypeSeq: this.model.get('autoTypeSeq'),
                autoTypeEnabled: this.model.getEffectiveEnableAutoType(),
                defaultAutoTypeSeq: this.model.getParentEffectiveAutoTypeSeq()
            }, true);
            if (!this.model.get('title')) {
                this.$el.find('#grp__field-title').focus();
            }
        }
        this.createScroll({
            root: this.$el.find('.grp')[0],
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

    changeTitle: function(e) {
        const title = $.trim(e.target.value);
        if (title) {
            if (!this.model.get('top') && title !== this.model.get('title')) {
                this.model.setName(title);
            }
        } else {
            if (this.model.isJustCreated) {
                this.model.removeWithoutHistory();
                Backbone.trigger('edit-group');
            }
        }
    },

    changeAutoTypeSeq: function(e) {
        const el = e.target;
        const seq = $.trim(el.value);
        AutoType.validate(null, seq, err => {
            $(e.target).toggleClass('input--error', !!err);
            if (!err) {
                this.model.setAutoTypeSeq(seq);
            }
        });
    },

    focusAutoTypeSeq: function(e) {
        if (!this.views.hint) {
            this.views.hint = new AutoTypeHintView({input: e.target}).render();
            this.views.hint.on('remove', () => { delete this.views.hint; });
        }
    },

    showIconsSelect: function() {
        if (this.views.sub) {
            this.removeSubView();
        } else {
            const subView = new IconSelectView({
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
        const enabled = e.target.checked;
        this.model.setEnableSearching(enabled);
    },

    setEnableAutoType: function(e) {
        const enabled = e.target.checked;
        this.model.setEnableAutoType(enabled);
    },

    returnToApp: function() {
        Backbone.trigger('edit-group');
    }
});

_.extend(GrpView.prototype, Scrollable);

module.exports = GrpView;

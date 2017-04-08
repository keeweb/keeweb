const Backbone = require('backbone');
const Tip = require('../util/tip');

_.extend(Backbone.View.prototype, {
    hide: function() {
        Tip.hideTips(this.$el);
        return this.toggle(false);
    },

    show: function() {
        return this.toggle(true);
    },

    toggle: function(visible) {
        if (visible === undefined) {
            visible = this._hidden;
        }
        this.$el.toggleClass('show', !!visible);
        this.$el.toggleClass('hide', !visible);
        this._hidden = !visible;
        this.trigger(visible ? 'show' : 'hide');
        if (!visible) {
            Tip.hideTips(this.$el);
        }
        return this;
    },

    isHidden: function() {
        return this._hidden;
    },

    isVisible: function() {
        return !this._hidden;
    },

    afterPaint: function(callback) {
        this.requestAnimationFrame(function() {
            this.requestAnimationFrame(callback);
        });
    },

    setTimeout: function(callback) {
        setTimeout(callback.bind(this), 0);
    },

    requestAnimationFrame: function(callback) {
        requestAnimationFrame(callback.bind(this));
    },

    renderTemplate: function(model, replace) {
        Tip.hideTips(this.$el);
        if (replace && replace.plain) {
            this.$el.html(this.template(model));
        } else {
            if (replace) {
                this.$el.html('');
            }
            const el = $(this.template(model));
            if (!this._elAppended || replace) {
                this.$el.append(el);
                this._elAppended = true;
            } else {
                this.$el.replaceWith(el);
            }
            this.setElement(el);
        }
        Tip.createTips(this.$el);
    },

    _parentRemove: Backbone.View.prototype.remove,

    remove: function() {
        this.trigger('remove');
        this.removeInnerViews();
        if (this.scroll) {
            try {
                this.scroll.dispose();
            } catch (e) { }
        }
        Tip.hideTips(this.$el);
        this._parentRemove(arguments);
    },

    removeInnerViews: function() {
        if (this.views) {
            _.each(this.views, view => {
                if (view) {
                    if (view instanceof Backbone.View) {
                        view.remove();
                    } else if (view.length) {
                        view.forEach(v => v.remove());
                    }
                }
            });
            this.views = {};
        }
    },

    deferRender: function() {
        _.defer(this.render.bind(this));
    }
});

module.exports = Backbone.View;

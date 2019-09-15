const Backbone = require('backbone');
const Tip = require('../util/ui/tip');

_.extend(Backbone.View.prototype, {
    hide() {
        Tip.hideTips(this.$el);
        return this.toggle(false);
    },

    show() {
        return this.toggle(true);
    },

    toggle(visible) {
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

    isHidden() {
        return this._hidden;
    },

    isVisible() {
        return !this._hidden;
    },

    afterPaint(callback) {
        this.requestAnimationFrame(function() {
            this.requestAnimationFrame(callback);
        });
    },

    setTimeout(callback) {
        setTimeout(callback.bind(this), 0);
    },

    requestAnimationFrame(callback) {
        requestAnimationFrame(callback.bind(this));
    },

    renderTemplate(model, replace) {
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

    remove() {
        this.trigger('remove');
        this.removeInnerViews();
        if (this.scroll) {
            try {
                this.scroll.dispose();
            } catch (e) {}
        }
        Tip.hideTips(this.$el);
        this._parentRemove();
    },

    removeInnerViews() {
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

    deferRender() {
        _.defer(this.render.bind(this));
    }
});

module.exports = Backbone.View;

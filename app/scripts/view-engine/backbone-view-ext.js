import Backbone from 'backbone';
import { Tip } from 'util/ui/tip';

const backboneListenTo = Backbone.View.prototype.listenTo;

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
        requestAnimationFrame(() => requestAnimationFrame(callback));
    },

    renderTemplate(model, replace) {
        Tip.destroyTips(this.$el);
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
        Tip.destroyTips(this.$el);
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

    listenTo(obj, name, callback) {
        return backboneListenTo.call(this, obj, name, callback.bind(this));
    }
});

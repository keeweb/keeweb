'use strict';

var Backbone = require('backbone');

_.extend(Backbone.View.prototype, {
    hide: function() {
        return this.toggle(false);
    },

    show: function() {
        return this.toggle(true);
    },

    toggle: function(visible) {
        this.$el.toggleClass('hide', !visible);
        this._hidden = !visible;
        this.trigger(visible ? 'show' : 'hide');
        return this;
    },

    afterPaint: function(callback) {
        this.requestAnimationFrame(function() {
            this.requestAnimationFrame(callback);
        });
    },

    requestAnimationFrame: function(callback) {
        requestAnimationFrame(callback.bind(this));
    },

    renderTemplate: function(model, replace) {
        if (replace) {
            this.$el.html('');
        }
        var el = $(this.template(model));
        if (!this._elAppended || replace) {
            this.$el.append(el);
            this._elAppended = true;
        } else {
            this.$el.replaceWith(el);
        }
        this.setElement(el);
    },

    _parentRemove: Backbone.View.prototype.remove,

    remove: function() {
        this.trigger('remove');
        if (this.views) {
            _.each(this.views, function(view) {
                if (view) {
                    if (view instanceof Backbone.View) {
                        view.remove();
                    } else if (view.length) {
                        view.forEach(function (v) {
                            v.remove();
                        });
                    }
                }
            });
        }
        if (this.scroll) {
            try { this.scroll.dispose(); }
            catch (e) { }
        }
        this._parentRemove(arguments);
    }
});

module.exports = Backbone.View;

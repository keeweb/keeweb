'use strict';

var Backbone = require('backbone'),
    Tip = require('../util/tip');

_.extend(Backbone.View.prototype, {
    hide: function() {
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
        return this;
    },

    isHidden: function() {
        return this._hidden;
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
        if (replace && replace.plain) {
            this.$el.html(this.template(model));
        } else {
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
        }
        Tip.createTips(this.$el);
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

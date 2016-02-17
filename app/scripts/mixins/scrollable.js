'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../util/feature-detector'),
    baron = require('baron');

var isEnabled = FeatureDetector.isDesktop();

var Scrollable = {
    createScroll: function(opts) {
        opts.$ = Backbone.$;
        //opts.cssGuru = true;
        if (isEnabled) {
            if (this.scroll) {
                this.removeScroll();
            }
            this.scroll = baron(opts);
        }
        this.scroller = this.$el.find('.scroller');
        this.scrollerBar = this.$el.find('.scroller__bar');
        this.scrollerBarWrapper = this.$el.find('.scroller__bar-wrapper');
    },

    removeScroll: function() {
        if (this.scroll) {
            this.scroll.dispose();
            this.scroll = null;
        }
    },

    pageResized: function() {
        // TODO: check size on window resize
        //if (this.checkSize && (!e || e.source === 'window')) {
        //    this.checkSize();
        //}
        if (this.scroll) {
            this.scroll.update();
            this.requestAnimationFrame(function() {
                this.scroll.update();
                var barHeight = this.scrollerBar.height(),
                    wrapperHeight = this.scrollerBarWrapper.height();
                this.scrollerBarWrapper.toggleClass('invisible', barHeight >= wrapperHeight);
            });
        }
    },

    initScroll: function() {
        if (isEnabled) {
            this.listenTo(Backbone, 'page-geometry', this.pageResized);
        }
    }
};

module.exports = Scrollable;

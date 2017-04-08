const Backbone = require('backbone');
const FeatureDetector = require('../util/feature-detector');
const baron = require('baron');

const isEnabled = !FeatureDetector.isMobile;

const Scrollable = {
    createScroll: function(opts) {
        opts.$ = Backbone.$;
        // opts.cssGuru = true;
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
        // if (this.checkSize && (!e || e.source === 'window')) {
        //     this.checkSize();
        // }
        if (this.scroll) {
            this.scroll.update();
            this.requestAnimationFrame(function() {
                if (this.scroll) {
                    this.scroll.update();
                    const barHeight = this.scrollerBar.height();
                    const wrapperHeight = this.scrollerBarWrapper.height();
                    this.scrollerBarWrapper.toggleClass('invisible', barHeight >= wrapperHeight);
                }
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

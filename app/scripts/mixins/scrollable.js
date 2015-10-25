'use strict';

var Backbone = require('backbone');

var Scrollable = {
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
        this.listenTo(Backbone, 'page-geometry', this.pageResized);
    }
};

module.exports = Scrollable;

import baron from 'baron';
import { Events } from 'framework/events';
import { Features } from 'util/features';

const isEnabled = !Features.isMobile;

const SymbolRemoveScrollListenerAdded = Symbol('removeScrollAdded');

const Scrollable = {
    createScroll(opts) {
        // opts.cssGuru = true;
        if (isEnabled) {
            if (this.scroll) {
                this.removeScroll();
            }
            this.scroll = baron(opts);
            if (!this[SymbolRemoveScrollListenerAdded]) {
                this.once('remove', () => this.removeScroll);
                this[SymbolRemoveScrollListenerAdded] = true;
            }
        }
        this.scroller = this.$el.find('.scroller');
        this.scrollerBar = this.$el.find('.scroller__bar');
        this.scrollerBarWrapper = this.$el.find('.scroller__bar-wrapper');
    },

    removeScroll() {
        if (this.scroll) {
            try {
                this.scroll.dispose();
            } catch {}
            this.scroll = null;
        }
    },

    pageResized() {
        // TODO: check size on window resize
        // if (this.checkSize && (!e || e.source === 'window')) {
        //     this.checkSize();
        // }
        if (this.scroll) {
            this.scroll.update();
            requestAnimationFrame(() => {
                if (this.scroll) {
                    this.scroll.update();
                    const barHeight = Math.round(this.scrollerBar.height());
                    const wrapperHeight = Math.round(this.scrollerBarWrapper.height());
                    this.scrollerBarWrapper.toggleClass('invisible', barHeight >= wrapperHeight);
                }
            });
        }
    },

    initScroll() {
        if (isEnabled) {
            this.listenTo(Events, 'page-geometry', this.pageResized);
        }
    }
};

export { Scrollable };

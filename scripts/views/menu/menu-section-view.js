import { View } from 'framework/views/view';
import { AppSettingsModel } from 'models/app-settings-model';
import { Resizable } from 'framework/views/resizable';
import { Scrollable } from 'framework/views/scrollable';
import { MenuItemView } from 'views/menu/menu-item-view';
import throttle from 'lodash/throttle';
import template from 'templates/menu/menu-section.hbs';

class MenuSectionView extends View {
    template = template;

    events = {};

    itemViews = [];

    minHeight = 55;
    autoHeight = 'auto';

    constructor(model, options) {
        super(model, options);
        this.listenTo(this.model, 'change-items', this.itemsChanged);
        this.listenTo(this, 'view-resize', this.viewResized);
        this.once('remove', () => {
            if (this.scroll) {
                this.scroll.dispose();
            }
            this.removeInnerViews();
        });
    }

    render() {
        if (!this.itemsEl) {
            super.render(this.model);
            this.itemsEl = this.model.scrollable ? this.$el.find('.scroller') : this.$el;
            if (this.model.scrollable) {
                this.initScroll();
                this.createScroll({
                    root: this.$el[0],
                    scroller: this.$el.find('.scroller')[0],
                    bar: this.$el.find('.scroller__bar')[0]
                });
            }
        } else {
            this.removeInnerViews();
        }
        this.model.items.forEach((item) => {
            const itemView = new MenuItemView(item, { parent: this.itemsEl[0] });
            itemView.render();
            this.itemViews.push(itemView);
        });
        if (this.model.drag) {
            const height = AppSettingsModel.tagsViewHeight;
            if (typeof height === 'number') {
                this.$el.height();
                this.$el.css('flex', '0 0 ' + height + 'px');
            }
        }
        this.pageResized();
    }

    maxHeight() {
        return this.$el.parent().height() - 116;
    }

    removeInnerViews() {
        this.itemViews.forEach((itemView) => itemView.remove());
        this.itemViews = [];
    }

    itemsChanged() {
        this.render();
    }

    viewResized(size) {
        this.$el.css('flex', '0 0 ' + (size ? size + 'px' : 'auto'));
        this.saveViewHeight(size);
    }

    saveViewHeight = throttle((size) => {
        AppSettingsModel.tagsViewHeight = size;
    }, 1000);
}

Object.assign(MenuSectionView.prototype, Resizable);
Object.assign(MenuSectionView.prototype, Scrollable);

export { MenuSectionView };

import { Events } from 'framework/events';
import { View } from 'framework/views/view';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';
import { AppSettingsModel } from 'models/app-settings-model';
import { Resizable } from 'framework/views/resizable';
import { DragView } from 'views/drag-view';
import { MenuSectionView } from 'views/menu/menu-section-view';
import throttle from 'lodash/throttle';
import template from 'templates/menu/menu.hbs';

class MenuView extends View {
    parent = '.app__menu';

    template = template;

    events = {};

    sectionViews = [];

    minWidth = 130;
    maxWidth = 300;

    constructor(model, options) {
        super(model, options);
        this.listenTo(this.model, 'change:sections', this.menuChanged);
        this.listenTo(this, 'view-resize', this.viewResized);
        this.onKey(
            Keys.DOM_VK_UP,
            this.selectPreviousSection,
            KeyHandler.SHORTCUT_ACTION + KeyHandler.SHORTCUT_OPT
        );
        this.onKey(
            Keys.DOM_VK_DOWN,
            this.selectNextSection,
            KeyHandler.SHORTCUT_ACTION + KeyHandler.SHORTCUT_OPT
        );
        this.once('remove', () => {
            this.sectionViews.forEach((sectionView) => sectionView.remove());
            this.sectionViews = [];
        });
    }

    render() {
        super.render();
        const sectionsEl = this.$el.find('.menu');
        this.model.sections.forEach(function (section) {
            const sectionView = new MenuSectionView(section, { parent: sectionsEl[0] });
            sectionView.render();
            if (section.drag) {
                const dragEl = $('<div/>').addClass('menu__drag-section').appendTo(sectionsEl);
                const dragView = new DragView('y', { parent: dragEl[0] });
                sectionView.listenDrag(dragView);
                dragView.render();
                this.sectionViews.push(dragView);
            }
            this.sectionViews.push(sectionView);
        }, this);
        if (typeof AppSettingsModel.menuViewWidth === 'number') {
            this.$el.width(AppSettingsModel.menuViewWidth);
        }
    }

    menuChanged() {
        this.render();
    }

    viewResized = throttle((size) => {
        AppSettingsModel.menuViewWidth = size;
    }, 1000);

    switchVisibility(visible) {
        this.$el.toggleClass('menu-visible', visible);
    }

    selectPreviousSection() {
        Events.emit('select-previous-menu-item');
    }

    selectNextSection() {
        Events.emit('select-next-menu-item');
    }
}

Object.assign(MenuView.prototype, Resizable);

export { MenuView };

import { View } from 'view-engine/view';

class ListWrapView extends View {
    parent = '.app__list-wrap';

    events = {};

    constructor(model) {
        super(model);
        this.listenTo(this.model.settings, 'change:tableView', this.setListLayout);
    }

    render() {
        this.el = document.querySelector(this.parent);
        this.setListLayout();
    }

    setListLayout() {
        const tableView = !!this.model.settings.get('tableView');
        this.el.classList.toggle('app__list-wrap--table', tableView);
    }
}

export { ListWrapView };

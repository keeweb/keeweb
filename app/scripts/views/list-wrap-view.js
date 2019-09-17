import { View } from 'framework/views/view';

class ListWrapView extends View {
    parent = '.app__list-wrap';

    template = () => '';

    events = {};

    constructor(model, options) {
        super(model, options);
        this.listenTo(this.model.settings, 'change:tableView', this.setListLayout);
    }

    render() {
        super.render();
        this.setListLayout();
    }

    setListLayout() {
        const tableView = !!this.model.settings.tableView;
        this.el.classList.toggle('app__list-wrap--table', tableView);
    }
}

export { ListWrapView };

const Backbone = require('backbone');

const ListWrapView = Backbone.View.extend({
    events: {},

    initialize() {
        this.listenTo(this.model.settings, 'change:tableView', this.setListLayout);
    },

    render() {
        this.setListLayout();
    },

    setListLayout() {
        const tableView = this.model.settings.get('tableView');
        this.$el.toggleClass('app__list-wrap--table', tableView);
    }
});

module.exports = ListWrapView;

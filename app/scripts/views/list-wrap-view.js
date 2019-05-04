import Backbone from 'backbone';

const ListWrapView = Backbone.View.extend({
    events: {
    },

    initialize: function() {
        this.listenTo(this.model.settings, 'change:tableView', this.setListLayout);
    },

    render: function() {
        this.setListLayout();
    },

    setListLayout: function() {
        const tableView = this.model.settings.get('tableView');
        this.$el.toggleClass('app__list-wrap--table', tableView);
    }
});

export default ListWrapView;

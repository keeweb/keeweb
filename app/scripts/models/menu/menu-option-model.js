import Backbone from 'backbone';

const MenuOptionModel = Backbone.Model.extend({
    defaults: {
        title: '',
        cls: '',
        value: '',
        active: false,
        filterValue: null
    }
});

export { MenuOptionModel };

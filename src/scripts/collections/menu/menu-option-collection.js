import Backbone from 'backbone';
import MenuOptionModel from '../../models/menu/menu-option-model';

const MenuOptionCollection = Backbone.Collection.extend({
    model: MenuOptionModel
});

export default MenuOptionCollection;

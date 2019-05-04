import Backbone from 'backbone';
import MenuItemModel from '../../models/menu/menu-item-model';

const MenuItemCollection = Backbone.Collection.extend({
    model: MenuItemModel
});

export default MenuItemCollection;

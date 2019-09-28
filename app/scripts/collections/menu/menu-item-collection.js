import { Collection } from 'framework/collection';
import { MenuItemModel } from 'models/menu/menu-item-model';

class MenuItemCollection extends Collection {
    static model = MenuItemModel;
}

export { MenuItemCollection };

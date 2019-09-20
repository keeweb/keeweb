import { Collection } from 'framework/collection';
import { MenuOptionModel } from 'models/menu/menu-option-model';

class MenuOptionCollection extends Collection {
    static model = MenuOptionModel;
}

export { MenuOptionCollection };

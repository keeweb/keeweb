import Backbone from 'backbone';
import { MenuSectionModel } from 'models/menu/menu-section-model';

const MenuSectionCollection = Backbone.Collection.extend({
    model: MenuSectionModel
});

export { MenuSectionCollection };

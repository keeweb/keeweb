import { Model } from 'framework/model';

class MenuOptionModel extends Model {}

MenuOptionModel.defineModelProperties({
    title: '',
    cls: '',
    value: '',
    active: false,
    filterValue: null
});

export { MenuOptionModel };

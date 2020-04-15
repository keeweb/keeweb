import { Model } from 'framework/model';

class ExternalEntryModel extends Model {
    tags = [];
    fields = {};

    get external() {
        return true;
    }
}

ExternalEntryModel.defineModelProperties({
    id: '',
    device: undefined,
    title: undefined,
    description: undefined,
    fields: undefined,
    icon: undefined,
    tags: undefined
});

export { ExternalEntryModel };

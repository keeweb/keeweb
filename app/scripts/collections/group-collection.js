import Backbone from 'backbone';
import { GroupModel } from 'models/group-model';

const GroupCollection = Backbone.Collection.extend({
    model: GroupModel
});

export { GroupCollection };

const Backbone = require('backbone');
const GroupModel = require('../models/group-model');

const GroupCollection = Backbone.Collection.extend({
    model: GroupModel
});

module.exports = GroupCollection;

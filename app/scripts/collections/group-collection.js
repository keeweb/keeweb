'use strict';

var Backbone = require('backbone'),
    GroupModel = require('../models/group-model');

var GroupCollection = Backbone.Collection.extend({
    model: GroupModel
});

module.exports = GroupCollection;

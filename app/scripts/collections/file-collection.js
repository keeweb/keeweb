'use strict';

var Backbone = require('backbone'),
    FileModel = require('../models/file-model');

var FileCollection = Backbone.Collection.extend({
    model: FileModel,

    hasOpenFiles: function() {
        return this.some(function(file) { return file.get('open'); });
    },

    hasUnsavedFiles: function() {
        return this.some(function(file) { return file.get('modified'); });
    },

    getByName: function(name) {
        return this.find(function(file) { return file.get('name') === name; });
    }
});

module.exports = FileCollection;

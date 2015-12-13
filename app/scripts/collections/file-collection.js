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

    hasDirtyFiles: function() {
        return this.some(function(file) { return file.get('dirty'); });
    },

    getByName: function(name) {
        return this.find(function(file) { return file.get('name').toLowerCase() === name.toLowerCase(); });
    },

    getById: function(id) {
        return this.find(function(file) { return file.get('id') === id; });
    }
});

module.exports = FileCollection;

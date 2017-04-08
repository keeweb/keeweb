const Backbone = require('backbone');
const FileModel = require('../models/file-model');

const FileCollection = Backbone.Collection.extend({
    model: FileModel,

    hasOpenFiles: function() {
        return this.some(file => file.get('open'));
    },

    hasUnsavedFiles: function() {
        return this.some(file => file.get('modified'));
    },

    hasDirtyFiles: function() {
        return this.some(file => file.get('dirty'));
    },

    getByName: function(name) {
        return this.find(file => file.get('name').toLowerCase() === name.toLowerCase());
    }
});

module.exports = FileCollection;

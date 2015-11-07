'use strict';

var Storage = require('./storage');

var MaxItems = 5;

var LastOpenFiles = {
    all: function() {
        try {
            return JSON.parse(localStorage.lastOpenFiles).map(function(f) {
                f.dt = Date.parse(f.dt);
                return f;
            });
        } catch (e) {
            return [];
        }
    },

    byName: function(name) {
        return this.all().filter(function(f) { return f.name === name; })[0];
    },

    save: function(files) {
        try {
            localStorage.lastOpenFiles = JSON.stringify(files);
        } catch (e) {
            console.error('Error saving last open files', e);
        }
    },

    add: function(name, storage, path, availOffline) {
        console.log('Add last open file', name, storage, path);
        var files = this.all();
        files = files.filter(function(f) { return f.name !== name; });
        files.unshift({ name: name, storage: storage, path: path, availOffline: availOffline, dt: new Date() });
        while (files.length > MaxItems) {
            files.pop();
        }
        this.save(files);
    },

    remove: function(name) {
        console.log('Remove last open file', name);
        var files = this.all();
        files.forEach(function(file) {
            if (file.name === name && file.availOffline) {
                Storage.cache.remove(file.name);
            }
        }, this);
        files = files.filter(function(file) { return file.name !== name; });
        this.save(files);
    }
};

module.exports = LastOpenFiles;

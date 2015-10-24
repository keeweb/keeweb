'use strict';

var Backbone = require('backbone'),
    OpenFileView = require('./open-file-view'),
    FileModel = require('../models/file-model'),
    Launcher = require('../util/launcher');

var OpenView = Backbone.View.extend({
    template: require('templates/open.html'),

    views: null,
    file: null,

    events: {
        'dragover': 'dragover',
        'dragleave': 'dragleave',
        'drop': 'drop'
    },

    initialize: function () {
        this.file = new FileModel();
        this.views = { openFile: new OpenFileView({ model: this.file }) };
        this.listenTo(this.file, 'change:open', this.fileOpened);
        this.listenTo(this.views.openFile, 'select', this.selectFile);
        this.listenTo(this.views.openFile, 'create', this.createNewFile);
        this.listenTo(this.views.openFile, 'create-demo', this.createDemoFile);
    },

    render: function () {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.setElement($(this.template(this.model)).appendTo(this.$el));
        this.views.openFile.setElement(this.$el).render();
        return this;
    },

    selectFile: function(e) {
        this.file.open(e.password, e.fileData, e.keyFileData);
    },

    createNewFile: function() {
        var name;
        for (var i = 0; ; i++) {
            name = 'New' + (i || '');
            if (!this.model.files.getByName(name)) {
                break;
            }
        }
        this.file.create(name);
    },

    createDemoFile: function() {
        if (!this.model.files.getByName('Demo')) {
            this.file.createDemo();
        } else {
            this.trigger('cancel');
        }
    },

    fileOpened: function(model, open) {
        if (open) {
            this.model.addFile(this.file);
        }
    },

    dragover: function(e) {
        e.preventDefault();
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        if (this.model && !this.$el.hasClass('open--drag')) {
            this.$el.addClass('open--drag');
        }
    },

    dragleave: function() {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.dragTimeout = setTimeout((function() {
            this.$el.removeClass('open--drag');
        }).bind(this), 100);
    },

    drop: function(e) {
        e.preventDefault();
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.$el.removeClass('open--drag');
        var files = e.target.files || e.dataTransfer.files;
        var dataFile = _.find(files, function(file) { return file.name.split('.').pop().toLowerCase() === 'kdbx'; });
        var keyFile = _.find(files, function(file) { return file.name.split('.').pop().toLowerCase() === 'key'; });
        if (dataFile) {
            this.views.openFile.setFile(dataFile, keyFile);
        }
    },

    showOpenLocalFile: function(path) {
        if (path && Launcher) {
            try {
                var name = path.match(/[^/\\]*$/)[0];
                var data = Launcher.readFile(path);
                var file = new Blob([data]);
                Object.defineProperties(file, {
                    path: { value: path },
                    name: { value: name }
                });
                this.views.openFile.setFile(file);
            } catch (e) {
            }
        }
    }
});

module.exports = OpenView;

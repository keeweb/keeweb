const Backbone = require('backbone');
const UrlUtil = require('../util/url-util');

const StorageFileListView = Backbone.View.extend({
    template: require('templates/storage-file-list.hbs'),

    events: {
        'click .open-list__file': 'fileClick',
        'click .open-list__check-wrap': 'showAllCheckClick'
    },

    initialize() {
        this.allStorageFiles = {};
        this.showHiddenFiles = !!this.model.showHiddenFiles;
    },

    render() {
        let files = this.model.files.map(file => {
            this.allStorageFiles[file.path] = file;
            return {
                path: file.path,
                name: file.name.replace(/\.kdbx$/i, ''),
                kdbx: UrlUtil.isKdbx(file.name),
                dir: file.dir
            };
        });
        const visibleFiles = files.filter(f => !f.dir && f.kdbx);
        const canShowHiddenFiles = visibleFiles.length && files.length > visibleFiles.length;
        if (!this.showHiddenFiles) {
            if (visibleFiles.length > 0) {
                files = visibleFiles;
            } else {
                this.showHiddenFiles = true;
            }
        }
        const density = files.length > 14 ? 3 : files.length > 7 ? 2 : 1;
        this.renderTemplate({
            files,
            density,
            showHiddenFiles: this.showHiddenFiles,
            canShowHiddenFiles: canShowHiddenFiles
        });
        return this;
    },

    fileClick(e) {
        const result = $(e.target).closest('.open-list__file').data('path');
        const file = this.allStorageFiles[result];
        this.trigger('selected', file);
    },

    showAllCheckClick(e) {
        e.stopPropagation();
        this.showHiddenFiles = !this.showHiddenFiles;
        this.render();
    }
});

module.exports = StorageFileListView;

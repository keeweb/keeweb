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
                name: UrlUtil.getDataFileName(file.name),
                kdbx: UrlUtil.isKdbx(file.name),
                dir: file.dir
            };
        });
        let hasHiddenFiles = this.showHiddenFiles;
        if (!this.showHiddenFiles) {
            const allFilesLength = files.length;
            files = files.filter(f => !f.dir && f.kdbx);
            hasHiddenFiles = files.length - allFilesLength;
        }
        const density = files.length > 14 ? 3 : files.length > 7 ? 2 : 1;
        this.renderTemplate({
            files,
            density,
            showHiddenFiles: this.showHiddenFiles,
            hasHiddenFiles: hasHiddenFiles
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

import { View } from 'framework/views/view';
import { UrlFormat } from 'util/formatting/url-format';
import template from 'templates/storage-file-list.hbs';

class StorageFileListView extends View {
    template = template;

    events = {
        'click .open-list__file': 'fileClick',
        'click .open-list__check-wrap': 'showAllCheckClick',
        'change #open-list__check': 'showAllCheckChange'
    };

    constructor(model) {
        super(model);
        this.allStorageFiles = {};
        this.showHiddenFiles = false;
    }

    render() {
        let files = this.model.files.map((file) => {
            this.allStorageFiles[file.path] = file;
            return {
                path: file.path,
                name: file.name.replace(/\.kdbx$/i, ''),
                kdbx: UrlFormat.isKdbx(file.name),
                dir: file.dir
            };
        });
        const visibleFiles = files.filter((f) => f.dir || f.kdbx);
        const canShowHiddenFiles = visibleFiles.length && files.length > visibleFiles.length;
        if (!this.showHiddenFiles) {
            if (visibleFiles.length > 0) {
                files = visibleFiles;
            }
        }
        const density = files.length > 14 ? 3 : files.length > 7 ? 2 : 1;
        super.render({
            files,
            density,
            showHiddenFiles: this.showHiddenFiles,
            canShowHiddenFiles
        });
    }

    fileClick(e) {
        const result = $(e.target).closest('.open-list__file').data('path');
        const file = this.allStorageFiles[result];
        this.emit('selected', file);
    }

    showAllCheckClick(e) {
        e.stopPropagation();
    }

    showAllCheckChange(e) {
        this.showHiddenFiles = e.target.checked;
        this.render();
    }
}

export { StorageFileListView };

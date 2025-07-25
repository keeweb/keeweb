import { View } from 'framework/views/view';
import template from 'templates/extension/extension-connect.hbs';

class ExtensionConnectView extends View {
    template = template;

    events = {
        'change #extension-connect__ask-get': 'askGetChanged',
        'change .extension-connect__file-check': 'fileChecked'
    };

    constructor(model) {
        super(model);
        this.config = {
            askGet: this.model.askGet,
            allFiles: this.model.allFiles,
            files: this.model.files.filter((f) => f.checked).map((f) => f.id)
        };
    }

    render() {
        super.render({
            ...this.model,
            ...this.config,
            files: this.model.files.map((f) => ({
                id: f.id,
                name: f.name,
                checked: this.config.files.includes(f.id)
            }))
        });
    }

    fileChecked(e) {
        const fileId = e.target.dataset.file;
        const checked = e.target.checked;

        if (fileId === 'all') {
            this.config.allFiles = checked;
            this.config.files = this.model.files.map((f) => f.id);
        } else {
            if (checked) {
                this.config.files.push(fileId);
            } else {
                this.config.files = this.config.files.filter((f) => f !== fileId);
                this.config.allFiles = false;
            }
        }

        this.render();

        const atLeastOneFileSelected = this.config.files.length > 0 || this.config.allFiles;

        const allowButton = document.querySelector('.modal button[data-result=yes]');
        allowButton.classList.toggle('hide', !atLeastOneFileSelected);
    }

    askGetChanged(e) {
        this.config.askGet = e.target.value;
    }
}

export { ExtensionConnectView };

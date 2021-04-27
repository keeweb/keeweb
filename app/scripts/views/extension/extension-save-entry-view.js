import { View } from 'framework/views/view';
import template from 'templates/extension/extension-save-entry.hbs';

class ExtensionSaveEntryView extends View {
    template = template;

    events = {
        'change #extension-save-entry__auto': 'autoChanged',
        'change #extension-save-entry__group': 'groupChanged'
    };

    constructor(model) {
        super(model);

        const selectedGroup = model.allGroups.find((g) => g.selected);
        this.config = {
            askSave: model.askSave || 'always',
            groupId: selectedGroup.id,
            fileId: selectedGroup.fileId
        };
    }

    render() {
        super.render(this.model);
    }

    autoChanged(e) {
        this.config.askSave = e.target.checked ? 'auto' : 'always';
    }

    groupChanged(e) {
        const option = e.target.options[e.target.selectedIndex];
        this.config.groupId = option.value;
        this.config.fileId = option.dataset.file;
    }
}

export { ExtensionSaveEntryView };

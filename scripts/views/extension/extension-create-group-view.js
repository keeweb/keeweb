import { View } from 'framework/views/view';
import template from 'templates/extension/extension-create-group.hbs';

class ExtensionCreateGroupView extends View {
    template = template;

    events = {
        'change #extension-create-group__file': 'fileChanged'
    };

    constructor(model) {
        super(model);

        this.selectedFile = model.files.find((f) => f.selected).id;
    }

    render() {
        super.render(this.model);
    }

    fileChanged(e) {
        this.selectedFile = e.target.value;
    }
}

export { ExtensionCreateGroupView };

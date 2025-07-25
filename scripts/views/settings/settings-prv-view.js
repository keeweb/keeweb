import { View } from 'framework/views/view';
import { Storage } from 'storage';
import template from 'templates/settings/settings-prv.hbs';

class SettingsPrvView extends View {
    template = template;

    events = {
        'change .settings__general-prv-field-sel': 'changeField',
        'input .settings__general-prv-field-txt': 'changeField',
        'change .settings__general-prv-field-check': 'changeCheckbox'
    };

    render() {
        const storage = Storage[this.model.name];
        if (storage && storage.getSettingsConfig) {
            super.render(storage.getSettingsConfig());
        }
    }

    changeField(e) {
        const id = e.target.dataset.id;
        const value = e.target.value;
        if (value && !e.target.checkValidity()) {
            return;
        }
        const storage = Storage[this.model.name];
        storage.applySetting(id, value);
        if ($(e.target).is('select')) {
            this.render();
        }
    }

    changeCheckbox(e) {
        const id = e.target.dataset.id;
        const value = !!e.target.checked;
        const storage = Storage[this.model.name];
        storage.applySetting(id, value);
    }
}

export { SettingsPrvView };

import { Model } from 'framework/model';
import { SettingsStore } from 'comp/settings/settings-store';

class RuntimeDataModel extends Model {
    constructor() {
        super();
        this.on('change', () => this.save());
    }

    load() {
        return SettingsStore.load('runtime-data').then((data) => {
            if (data) {
                this.set(data, { silent: true });
            }
        });
    }

    save() {
        SettingsStore.save('runtime-data', this);
    }
}

RuntimeDataModel.defineModelProperties({}, { extensions: true });

const instance = new RuntimeDataModel();
window.RuntimeDataModel = instance;

export { instance as RuntimeDataModel };

import { Model } from 'framework/model';
import { SettingsStore } from 'comp/settings/settings-store';

class UpdateModel extends Model {
    load() {
        return SettingsStore.load('update-info').then((data) => {
            if (data) {
                try {
                    for (const [key, val] of Object.entries(data)) {
                        if (/Date$/.test(key)) {
                            data[key] = val ? new Date(val) : null;
                        }
                    }
                    this.set(data, { silent: true });
                } catch (e) {
                    /* failed to load model */
                }
            }
        });
    }

    save() {
        const attr = { ...this };
        for (const key of Object.keys(attr)) {
            if (key.lastIndexOf('update', 0) === 0) {
                delete attr[key];
            }
        }
        SettingsStore.save('update-info', attr);
    }
}

UpdateModel.defineModelProperties({
    lastSuccessCheckDate: null,
    lastCheckDate: null,
    lastVersion: null,
    lastVersionReleaseDate: null,
    lastCheckError: null,
    lastCheckUpdMin: null,
    status: null,
    updateStatus: null,
    updateError: null,
    updateManual: false
});

const instance = new UpdateModel();

export { instance as UpdateModel };

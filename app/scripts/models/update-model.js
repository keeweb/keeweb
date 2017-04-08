const Backbone = require('backbone');
const SettingsStore = require('../comp/settings-store');

const UpdateModel = Backbone.Model.extend({
    defaults: {
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
    },

    initialize: function() {
    },

    load: function() {
        return SettingsStore.load('update-info').then(data => {
            if (data) {
                try {
                    _.each(data, (val, key) => {
                        if (/Date$/.test(key)) {
                            data[key] = val ? new Date(val) : null;
                        }
                    });
                    this.set(data, {silent: true});
                } catch (e) { /* failed to load model */
                }
            }
        });
    },

    save: function() {
        const attr = _.clone(this.attributes);
        Object.keys(attr).forEach(key => {
            if (key.lastIndexOf('update', 0) === 0) {
                delete attr[key];
            }
        });
        SettingsStore.save('update-info', attr);
    }
});

UpdateModel.instance = new UpdateModel();

module.exports = UpdateModel;

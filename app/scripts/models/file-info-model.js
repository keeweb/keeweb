const Backbone = require('backbone');

const FileInfoModel = Backbone.Model.extend({
    defaults: {
        id: '',
        name: '',
        storage: null,
        path: null,
        modified: false,
        editState: null,
        rev: null,
        syncDate: null,
        openDate: null,
        keyFileName: null,
        keyFileHash: null,
        opts: null,
        backup: null,
        fingerprint: null
    },

    initialize: function(data, options) {
        _.each(data, function(val, key) {
            if (/Date$/.test(key)) {
                this.set(key, val ? new Date(val) : null, options);
            }
        }, this);
    }
});

module.exports = FileInfoModel;

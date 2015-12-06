'use strict';

var Backbone = require('backbone');

var FileInfoModel = Backbone.Model.extend({
    defaults: {
        id: '',
        name: '',
        storage: null,
        path: null,
        availOffline: false,
        modified: false,
        editState: null,
        pullRev: null,
        pullDate: null,
        openDate: null
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

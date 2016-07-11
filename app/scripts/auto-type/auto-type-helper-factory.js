'use strict';

var Launcher = require('../comp/launcher');

var AutoTypeHelperFactory = {
    create: function() {
        if (!Launcher) {
            return null;
        }
        var AutoTypeHelper = require('./helper/auto-type-helper-' + Launcher.platform());
        return new AutoTypeHelper();
    }
};

module.exports = AutoTypeHelperFactory;

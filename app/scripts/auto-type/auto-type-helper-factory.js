'use strict';

var Launcher = require('../comp/launcher');

var AutoTypeHelperFactory = {
    create: function() {
        if (Launcher && Launcher.autoTypeSupported) {
            var AutoTypeHelper = require('./helper/auto-type-helper-' + Launcher.platform());
            return new AutoTypeHelper();
        }
        return null;
    }
};

module.exports = AutoTypeHelperFactory;

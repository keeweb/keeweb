'use strict';

var Launcher = require('../../comp/launcher');

var AutoTypeHelperFactory = {
    create: function() {
        if (!Launcher) {
            return null;
        }
        var AutoTypeHelperImpl = require('./helper/auto-type-helper-' + Launcher.platform());
        return new AutoTypeHelperImpl();
    }
};

module.exports = AutoTypeHelperFactory;

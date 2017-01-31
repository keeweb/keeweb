'use strict';

const Launcher = require('../comp/launcher');

const AutoTypeHelperFactory = {
    create: function() {
        if (!Launcher) {
            return null;
        }
        const AutoTypeHelper = require('./helper/auto-type-helper-' + Launcher.platform());
        return new AutoTypeHelper();
    }
};

module.exports = AutoTypeHelperFactory;

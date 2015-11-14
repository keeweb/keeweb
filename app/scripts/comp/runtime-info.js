'use strict';

var Launcher = require('../comp/launcher');

var RuntimeInfo = {
    version: '@@VERSION',
    buildDate: '@@DATE',
    commit: '@@COMMIT',
    userAgent: navigator.userAgent,
    launcher: Launcher ? Launcher.name + ' v' + Launcher.version : ''
};

module.exports = RuntimeInfo;

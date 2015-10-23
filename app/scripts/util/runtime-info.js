'use strict';

var Launcher = require('./launcher');

var RuntimeInfo = {
    version: '@@VERSION',
    buildDate: '@@DATE',
    userAgent: navigator.userAgent,
    launcher: Launcher ? Launcher.name + ' v' + Launcher.version : ''
};

module.exports = RuntimeInfo;

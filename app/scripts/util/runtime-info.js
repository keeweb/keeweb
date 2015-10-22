'use strict';

var RuntimeInfo = {
    version: '@@VERSION',
    buildDate: '@@DATE',
    userAgent: navigator.userAgent,
    launcher: window.process && window.process.versions && window.process.versions.electron
};

module.exports = RuntimeInfo;

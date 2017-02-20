'use strict';

let Launcher;

if (window.process && window.process.versions && window.process.versions.electron) {
    Launcher = require('./launcher-electron');
} else if (window.cordova) {
    // Launcher = require('./launcher-cordova');
}

module.exports = Launcher;

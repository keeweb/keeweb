let Launcher;

if (window.process && window.process.versions && window.process.versions.electron) {
    Launcher = require('./launcher-electron').Launcher;
} else if (window.cordova) {
    Launcher = require('./launcher-cordova').Launcher;
}

export { Launcher };

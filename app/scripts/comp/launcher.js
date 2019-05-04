let Launcher;

if (window.process && window.process.versions && window.process.versions.electron) {
    Launcher = require('./launcher-electron').default;
} else if (window.cordova) {
    // Launcher = require('./launcher-cordova').default; // commented out, while we don't support cordova
}

export default Launcher;

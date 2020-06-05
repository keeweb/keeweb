let Launcher;

if (window.process && window.process.versions && window.process.versions.electron) {
    Launcher = require('./launcher-electron').Launcher;
}

export { Launcher };

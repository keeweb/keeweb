const { app } = require('electron');

function log(name, level, ...args) {
    const mainWindow = app.getMainWindow();
    mainWindow.webContents.send('log', name, level, ...args);
}

class Logger {
    constructor(name) {
        this.name = name;
    }

    debug(...args) {
        log(this.name, 'debug', ...args);
    }

    info(...args) {
        log(this.name, 'info', ...args);
    }

    warn(...args) {
        log(this.name, 'warn', ...args);
    }

    error(...args) {
        log(this.name, 'error', ...args);
    }
}

module.exports = { Logger };

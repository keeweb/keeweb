const { ipcMain } = require('electron');
const { hardwareCrypt } = require('./ipc-handlers/hardware-crypt');

module.exports.setupIpcHandlers = () => {
    ipcMain.handle('hardware-crypt', hardwareCrypt);
};

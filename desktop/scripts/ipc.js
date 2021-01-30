const { ipcMain } = require('electron');
const { hardwareEncrypt, hardwareDecrypt } = require('./ipc-handlers/hardware-crypto');

module.exports.setupIpcHandlers = () => {
    ipcMain.handle('hardwareEncrypt', hardwareEncrypt);
    ipcMain.handle('hardwareDecrypt', hardwareDecrypt);
};

const { ipcMain } = require('electron');
const { hardwareEncrypt, hardwareDecrypt } = require('./ipc-handlers/hardware-crypto');

module.exports.setupIpcHandlers = () => {
    ipcMain.handle('hardware-encrypt', hardwareEncrypt);
    ipcMain.handle('hardware-decrypt', hardwareDecrypt);
};

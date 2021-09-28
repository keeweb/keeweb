const { ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

ipcMain.on('nativeModuleCall', nativeModuleCall);

let callbackWebContents;
let nativeModuleHost;

const spawnAnotherProcess = process.argv.includes('--native-module-host-process');

function startHost() {
    if (spawnAnotherProcess) {
        const exeName = path.basename(process.execPath, '.exe');
        const args = ['--native-module-host', '--in-process-gpu', '--disable-gpu'];
        if (exeName === 'Electron') {
            args.unshift(path.join(process.mainModule.path, 'main.js'));
        }

        nativeModuleHost = spawn(process.helperExecPath, args, {
            env: process.env,
            cwd: process.cwd(),
            stdio: ['inherit', 'inherit', 'inherit', 'ipc']
        });

        nativeModuleHost.on('message', onHostMessage);
        nativeModuleHost.on('error', onHostError);
        nativeModuleHost.on('exit', onHostExit);
        nativeModuleHost.on('disconnect', onHostDisconnect);
    } else {
        nativeModuleHost = new EventEmitter();
        nativeModuleHost.on('message', onHostMessage);
        nativeModuleHost.send = (msg) => {
            nativeModuleHost.emit('send', msg);
        };
        require('../../native-module-host').startInMain(nativeModuleHost);
    }
}

function nativeModuleCall(event, msg) {
    callbackWebContents = event.sender;
    if (!nativeModuleHost) {
        startHost();
    }
    if (nativeModuleHost) {
        nativeModuleHost.send(msg);
    }
}

function onHostMessage(msg) {
    callback('nativeModuleCallback', msg);
}

function onHostError(e) {
    callback('nativeModuleHostError', e);
}

function onHostExit(code, sig) {
    nativeModuleHost = undefined;
    callback('nativeModuleHostExit', { code, sig });
}

function onHostDisconnect() {
    nativeModuleHost = undefined;
    callback('nativeModuleHostDisconnect');
}

function callback(name, arg) {
    try {
        callbackWebContents.send(name, arg);
    } catch {}
}

module.exports = { nativeModuleCall };

const path = require('path');
const { spawn } = require('child_process');

let callbackWebContents;
let nativeModuleHost;

function startHost() {
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

const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');
const electron = require('electron');

function installUpdate(updateFilePath) {
    switch (process.platform) {
        case 'darwin':
            installDarwinUpdate(updateFilePath);
    }
}

function installDarwinUpdate(updateFilePath) {
    const appPath = process.execPath.replace(/\.app\/.*?$/, '.app');
    const installerAppPath = path.join(appPath, 'Contents', 'Installer', 'KeeWeb Installer.app');
    const tempPath = path.join(electron.app.getPath('temp'), 'KeeWeb');
    const tempInstallerPath = path.join(tempPath, 'KeeWeb Installer.app');

    if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
    }

    spawnSync('rm', ['-rf', tempInstallerPath]);
    const res = spawnSync('cp', ['-pRf', installerAppPath, tempInstallerPath]);
    if (res.status) {
        const copyErr = res.stderr.toString('utf8');
        throw new Error(`Error installing update: ${copyErr}`);
    }

    const installerExecutable = path.join(tempInstallerPath, 'Contents', 'MacOS', 'applet');
    spawn(
        installerExecutable,
        ['--update', `--wait-pid=${process.pid}`, `--dmg=${updateFilePath}`, `--app=${appPath}`],
        {
            detached: true
        }
    ).unref();
}

module.exports.installUpdate = installUpdate;

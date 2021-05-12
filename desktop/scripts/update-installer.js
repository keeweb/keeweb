const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');
const electron = require('electron');

function installUpdate(updateFilePath) {
    switch (process.platform) {
        case 'darwin':
            installDarwinUpdate(updateFilePath);
            break;
        case 'win32':
            installWin32Update(updateFilePath);
            break;
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
    spawnDetached(installerExecutable, [
        '--update',
        `--wait-pid=${process.pid}`,
        `--dmg=${updateFilePath}`,
        `--app=${appPath}`
    ]);

    electron.app.quit();
}

function installWin32Update(updateFilePath) {
    // spawn doesn't work on Windows in this case because of UAC
    // exec doesn't work if KeeWeb is killed immediately
    // so we write our command to a script and launch it

    const appDir = path.dirname(electron.app.getPath('exe'));
    const updateCommand = `"${updateFilePath}" /U1 /D=${appDir}`;

    const ps = spawnDetached('cmd');
    ps.stdin.end(`${updateCommand}\nexit\n`, 'utf8', () => {
        electron.app.quit();
    });
}

function spawnDetached(command, args) {
    const ps = spawn(command, args || [], { detached: true });
    ps.unref();
    return ps;
}

module.exports.installUpdate = installUpdate;

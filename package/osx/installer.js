#!/usr/bin/env osascript -l JavaScript

ObjC.import('Foundation');
ObjC.import('stdlib');

const app = Application.currentApplication();
app.includeStandardAdditions = true;

const args = getArgs();
if (args.update) {
    const waitPid = args.waitPid | 0;
    if (waitPid) {
        waitForExitOrKill(waitPid);
    }

    const dmg = checkFilePath(args.dmg, 'dmg');
    const target = checkFilePath(args.app, 'app');

    const targetOwner = app.doShellScript(`stat -f '%Su' ${target}`);
    const setAdminRights = targetOwner === 'root';

    const tmpDir = dmg + '.mount';

    let script = [
        `set -euxo pipefail`,
        `hdiutil detach ${tmpDir} 2>/dev/null || true`,
        `rm -rf ${tmpDir}`,
        `mkdir -p ${tmpDir}`,
        `hdiutil attach -readonly -nobrowse -mountpoint ${tmpDir} ${dmg}`,
        `rm -rf ${target}`,
        `cp -pR ${tmpDir}/KeeWeb.app ${target}`,
        `hdiutil detach ${tmpDir}``rm -rf ${tmpDir}`
    ];
    const scriptOptions = {};
    if (setAdminRights) {
        script.push(`chown -R 0 ${target}`);
        scriptOptions.administratorPrivileges = true;
    }
    script.push(`open ${target}`);
    script = script.join('\n');
    app.doShellScript(script, scriptOptions);
} else if (args.install) {
    app.doShellScript('chown -R 0 /Applications/KeeWeb.app', { administratorPrivileges: true });
} else {
    throw 'Unknown operation';
}

function getArgs() {
    // https://github.com/JXA-Cookbook/JXA-Cookbook/wiki/Shell-and-CLI-Interactions#arguments
    const objcArgs = $.NSProcessInfo.processInfo.arguments;
    const argc = objcArgs.count;
    const args = {};
    for (let i = 0; i < argc; i++) {
        const arg = ObjC.unwrap(objcArgs.objectAtIndex(i));
        const match = arg.match(/^--([^=]+)(=(.*))?/);
        if (match) {
            const argName = match[1].replace(/-./g, (m) => m[1].toUpperCase());
            args[argName] = match[3] || true;
        }
    }
    return args;
}

function waitForExitOrKill(pid) {
    for (let i = 0; i < 10; i++) {
        const psCount = Application('System Events').processes.whose({ unixId: pid }).length;
        if (psCount === 0) {
            return;
        }
        delay(1);
    }
    app.doShellScript(`kill ${pid}`);
}

function checkFilePath(path, ext) {
    if (!path) {
        throw `File not specified: ${ext}`;
    }
    if (!path.endsWith('.' + ext)) {
        throw `Bad file extension: ${ext} (${path})`;
    }
    const file = Application('System Events').files.byName(path);
    if (!file.exists()) {
        throw `File doesn't exist: ${ext} (${path})`;
    }
    return file.posixPath().replace(/ /g, '\\ ');
}

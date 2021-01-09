ObjC.import('Foundation');
ObjC.import('stdlib');

var app = Application.currentApplication();
app.includeStandardAdditions = true;

var args = getArgs();
if (args.update) {
    var waitPid = args.waitPid | 0;
    if (waitPid) {
        waitForExitOrKill(waitPid);
    }

    var dmg = checkFilePath(args.dmg, 'dmg');
    var target = checkFilePath(args.app, 'app');

    var targetOwner = app.doShellScript("stat -f '%Su' " + target);
    var setAdminRights = targetOwner === 'root';

    var tmpDir = dmg + '.mount';

    var script = [
        'set -euxo pipefail',
        'hdiutil detach ' + tmpDir + ' 2>/dev/null || true',
        'rm -rf ' + tmpDir,
        'mkdir -p ' + tmpDir,
        'hdiutil attach -readonly -nobrowse -mountpoint ' + tmpDir + ' ' + dmg,
        'rm -rf ' + target,
        'cp -pR ' + tmpDir + '/KeeWeb.app ' + target,
        'hdiutil detach ' + tmpDir,
        'rm -rf ' + tmpDir
    ];
    var scriptOptions = {};
    if (setAdminRights) {
        script.push('chown -R 0 ' + target);
        scriptOptions.administratorPrivileges = true;
    }
    script.push('open ' + target);
    script = script.join('\n');
    app.doShellScript(script, scriptOptions);
} else if (args.install) {
    app.doShellScript('chown -R 0 /Applications/KeeWeb.app', { administratorPrivileges: true });
} else {
    throw 'Unknown operation';
}

function getArgs() {
    // https://github.com/JXA-Cookbook/JXA-Cookbook/wiki/Shell-and-CLI-Interactions#arguments
    var objcArgs = $.NSProcessInfo.processInfo.arguments;
    var argc = objcArgs.count;
    var args = {};
    for (var i = 0; i < argc; i++) {
        var arg = ObjC.unwrap(objcArgs.objectAtIndex(i));
        var match = arg.match(/^--([^=]+)(=(.*))?/);
        if (match) {
            var argName = match[1].replace(/-./g, function (m) {
                m[1].toUpperCase();
            });
            args[argName] = match[3] || true;
        }
    }
    return args;
}

function waitForExitOrKill(pid) {
    for (var i = 0; i < 10; i++) {
        var psCount = Application('System Events').processes.whose({ unixId: pid }).length;
        if (psCount === 0) {
            return;
        }
        delay(1);
    }
    app.doShellScript('kill ' + pid);
}

function checkFilePath(path, ext) {
    if (!path) {
        throw 'File not specified: ' + ext;
    }
    if (!path.endsWith('.' + ext)) {
        throw 'Bad file extension: ' + ext + ' (' + path + ')';
    }
    var file = Application('System Events').files.byName(path);
    if (!file.exists()) {
        throw "File doesn't exist: " + ext + ' (' + path + ')';
    }
    return file.posixPath().replace(/ /g, '\\ ');
}

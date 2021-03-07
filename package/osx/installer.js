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
    var setOwnerToRoot = targetOwner === 'root';
    var runAsAdmin = setOwnerToRoot;
    if (!runAsAdmin) {
        try {
            app.doShellScript('test -w ' + target);
            var targetDir = target.replace(/[^\/]*$/, '');
            app.doShellScript('test -w ' + targetDir);
        } catch (e) {
            runAsAdmin = true;
        }
    }

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
    if (runAsAdmin) {
        scriptOptions.administratorPrivileges = true;
        if (setOwnerToRoot) {
            script.push('chown -R 0 ' + target);
        }
    }
    script.push('open ' + target);
    script = script.join('\n');
    try {
        runScriptOrDie(script, scriptOptions);
    } catch (e) {
        try {
            app.doShellScript('hdiutil detach ' + tmpDir);
            app.doShellScript('rm -rf ' + tmpDir);
        } catch (e) {}
        throw e;
    }
} else if (args.install) {
    try {
        app.doShellScript('chown -R 0 /Applications/KeeWeb.app', { administratorPrivileges: true });
    } catch (e) {
        $.exit(1);
    }
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
    try {
        app.doShellScript('kill ' + pid);
    } catch (e) {}
}

function checkFilePath(path, ext) {
    if (!path) {
        throw 'File not specified: ' + ext;
    }
    if (path.substr(-(ext.length + 1)) !== '.' + ext) {
        throw 'Bad file extension: ' + ext + ' (' + path + ')';
    }
    var file = Application('System Events').files.byName(path);
    if (!file.exists()) {
        throw "File doesn't exist: " + ext + ' (' + path + ')';
    }
    return file.posixPath().replace(/ /g, '\\ ');
}

function runScriptOrDie(script, options) {
    try {
        return app.doShellScript(script, options || {});
    } catch (e) {
        if (e.message === 'User canceled.') {
            $.exit(1);
        } else {
            throw e;
        }
    }
}

ObjC.import('Foundation');
ObjC.import('stdlib');

var app = Application.currentApplication();
app.includeStandardAdditions = true;

var args = getArgs();
if (args.verbose) console.log('KeeWeb installer:', JSON.stringify(args, null, 2));
if (args.update) {
    var waitPid = args.waitPid | 0;
    if (waitPid) {
        waitForExitOrKill(waitPid, args.verbose);
    }

    var dmg = checkFilePath(args.dmg, 'dmg');
    var target = checkFilePath(args.app, 'app');

    if (args.verbose) console.log('dmg:', dmg);
    if (args.verbose) console.log('target:', target);

    var targetOwner = app.doShellScript("stat -f '%Su' " + target);
    if (args.verbose) console.log('target owner:', targetOwner);

    var setOwnerToRoot = targetOwner === 'root';
    var runAsAdmin = setOwnerToRoot;
    if (!runAsAdmin) {
        try {
            app.doShellScript('test -w ' + target);
            var targetDir = target.replace(/[^\/]*$/, '');
            app.doShellScript('test -w ' + targetDir);
            if (args.verbose) console.log('permissions are ok');
        } catch (e) {
            runAsAdmin = true;
            if (args.verbose) console.log('permissions check error', e);
        }
    }

    if (args.verbose) console.log('run as admin:', runAsAdmin);

    var tmpDir = dmg + '.mount';

    var script = [
        'set -euxo pipefail',
        args.verbose ? 'echo detaching old disk image...' : '',
        'hdiutil detach ' + tmpDir + ' 2>/dev/null || true',
        args.verbose ? 'echo cleaning tmp dir...' : '',
        'rm -rf ' + tmpDir,
        args.verbose ? 'echo making tmp dir...' : '',
        'mkdir -p ' + tmpDir,
        args.verbose ? 'echo attaching disk image...' : '',
        'hdiutil attach -readonly -nobrowse -mountpoint ' + tmpDir + ' ' + dmg,
        args.verbose ? 'echo removing target...' : '',
        'rm -rf ' + target,
        args.verbose ? 'echo copying from tmp dir to target...' : '',
        'cp -pR ' + tmpDir + '/KeeWeb.app ' + target,
        args.verbose ? 'echo detaching disk image...' : '',
        'hdiutil detach ' + tmpDir,
        args.verbose ? 'echo cleaning tmp dir...' : '',
        'rm -rf ' + tmpDir
    ];
    var scriptOptions = {};
    if (runAsAdmin) {
        scriptOptions.administratorPrivileges = true;
        if (setOwnerToRoot) {
            if (args.verbose) script.push('echo changing target owner...');
            script.push('chown -R 0 ' + target);
        }
    }
    if (args.verbose) script.push('echo launching the app...');
    script.push('open ' + target);
    script = script.join('\n');

    if (args.verbose) console.log('executing script:\n\n' + script + '\n');

    try {
        var output = runScriptOrDie(script, scriptOptions);
        if (args.verbose) console.log('script output:\n\n' + output.replace(/\r/g, '\n'));
    } catch (e) {
        if (args.verbose) console.log('script error', e);
        try {
            app.doShellScript('hdiutil detach ' + tmpDir);
            app.doShellScript('rm -rf ' + tmpDir);
        } catch (e) {}
        throw e;
    }

    if (args.verbose) console.log('done');
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
                return m[1].toUpperCase();
            });
            args[argName] = match[3] || true;
        }
    }
    return args;
}

function waitForExitOrKill(pid, verbose) {
    if (verbose) console.log('waiting for process:', pid);
    for (var i = 0; i < 10; i++) {
        var psCount = Application('System Events').processes.whose({ unixId: pid }).length;
        if (verbose) console.log('process count:', psCount);
        if (psCount === 0) {
            return;
        }
        delay(1);
    }
    try {
        if (verbose) console.log('killing process');
        app.doShellScript('kill ' + pid);
    } catch (e) {
        if (verbose) console.log('error killing process', e);
    }
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

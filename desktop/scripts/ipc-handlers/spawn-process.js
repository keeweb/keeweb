const { ipcMain } = require('electron');
const { spawn } = require('child_process');

ipcMain.handle('spawnProcess', spawnProcess);

function spawnProcess(e, config) {
    return new Promise((resolve) => {
        const ps = spawn(config.cmd, config.args, config.options);
        [ps.stdin, ps.stdout, ps.stderr].forEach((s) => s.setEncoding('utf-8'));
        let stderr = '';
        let stdout = '';
        ps.stderr.on('data', (d) => {
            stderr += d.toString('utf-8');
            if (config.throwOnStdErr) {
                try {
                    ps.kill();
                } catch {}
            }
        });
        ps.stdout.on('data', (d) => {
            stdout += d.toString('utf-8');
        });
        ps.on('close', (code) => {
            if (config.trim !== false) {
                stdout = stdout.trim();
                stderr = stderr.trim();
            }
            resolve?.({
                code,
                stdout,
                stderr
            });
            resolve = null;
        });
        ps.on('error', (err) => {
            resolve?.({
                err
            });
            resolve = null;
        });
        if (config.data) {
            try {
                ps.stdin.end(config.data);
            } catch (err) {
                resolve?.({
                    err
                });
                resolve = null;
            }
        }
        process.nextTick(() => {
            // it should work without destroy, but a process doesn't get launched
            // xubuntu-desktop 19.04 / xfce
            // see https://github.com/keeweb/keeweb/issues/1234
            ps.stdin.destroy();
        });
        return ps;
    });
}

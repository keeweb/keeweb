const childProcess = require('child_process');

function getProcessInfo(pid) {
    return new Promise((resolve, reject) => {
        let cmd, args, parseOutput;
        if (process.platform === 'win32') {
            cmd = 'wmic';
            args = [
                'process',
                'where',
                `ProcessId=${pid}`,
                'get',
                'ProcessId,ParentProcessId,ExecutablePath',
                '/format:value'
            ];
            parseOutput = parseWmicOutput;
        } else {
            cmd = '/bin/ps';
            args = ['-opid=,ppid=,comm=', '-p', pid];
            parseOutput = parsePsOutput;
        }
        const ps = childProcess.spawn(cmd, args);

        const data = [];
        ps.stdout.on('data', (chunk) => data.push(chunk));

        ps.on('close', () => {
            const output = Buffer.concat(data).toString();
            try {
                const result = parseOutput(output);
                if (result.pid !== pid) {
                    throw new Error(`PID mismatch: ${result.pid} <> ${pid}`);
                }
                if (!result.appName) {
                    throw new Error(`Could not get app name for process ${pid}`);
                }
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
        ps.on('error', (e) => {
            reject(e);
        });
    });
}

function parsePsOutput(output) {
    const match = output.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) {
        throw new Error(`Bad PS output: ${output}`);
    }
    return {
        pid: match[1] | 0,
        ppid: match[2] | 0,
        execPath: match[3],
        appName: match[3].split('/').pop()
    };
}

function parseWmicOutput(output) {
    const result = {};
    const keyMap = {
        ProcessId: 'pid',
        ParentProcessId: 'ppid',
        ExecutablePath: 'execPath'
    };
    for (const line of output.split(/\n/)) {
        const match = line.trim().match(/^([^=]+)=(.*)$/);
        if (match) {
            const [, key, value] = match;
            const mapped = keyMap[key];
            if (mapped) {
                if (mapped.endsWith('id')) {
                    result[mapped] = value | 0;
                } else if (mapped === 'execPath') {
                    result[mapped] = value.replace(/^"([^"]+)"/g, '$1');
                    result.appName = value.split('\\').pop().replace(/\.exe/i, '');
                }
            }
        }
    }
    return result;
}

module.exports = { getProcessInfo };

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
                'ProcessId,ParentProcessId,CommandLine',
                '/format:value'
            ];
            parseOutput = parseWmicOutput;
        } else {
            cmd = '/bin/ps';
            args = ['-opid=,ppid=,command=', '-p', pid];
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
                if (!result.commandLine) {
                    throw new Error(`Could not get command line for process ${pid}`);
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
        parentPid: match[2] | 0,
        commandLine: match[3]
    };
}

function parseWmicOutput(output) {
    const result = {};
    const keyMap = {
        ProcessId: 'pid',
        ParentProcessId: 'parentPid',
        CommandLine: 'commandLine'
    };
    for (const line of output.split(/\n/)) {
        const match = line.trim().match(/^([^=]+)=(.*)$/);
        if (match) {
            const [, key, value] = match;
            const mapped = keyMap[key];
            if (mapped) {
                result[mapped] = mapped.endsWith('id') ? value | 0 : value;
            }
        }
    }
    return result;
}

module.exports = { getProcessInfo };

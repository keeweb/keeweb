const childProcess = require('child_process');

function getProcessInfo(pid) {
    return new Promise((resolve, reject) => {
        const process = childProcess.spawn('/bin/ps', ['-opid=,ppid=,command=', '-p', pid]);

        const data = [];
        process.stdout.on('data', (chunk) => data.push(chunk));

        process.on('close', () => {
            const output = Buffer.concat(data).toString();
            try {
                const result = parsePsOutput(output);
                if (result.pid !== pid) {
                    throw new Error(`PS pid mismatch: ${result.pid} <> ${pid}`);
                }
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
        process.on('error', (e) => {
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

module.exports = { getProcessInfo };

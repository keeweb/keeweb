import { Logger } from 'util/logger';

const logger = new Logger('start-profiler');

const networkTime = getNetworkTime();
let lastTs = window.htmlLoadTime;

const operations = [
    { name: 'fetching', elapsed: networkTime },
    { name: 'parsing', elapsed: lastTs - networkTime }
];

const StartProfiler = {
    milestone(name) {
        const ts = logger.ts();
        const elapsed = ts - lastTs;
        lastTs = ts;
        operations.push({ name, elapsed });
    },

    report() {
        const time = Math.round(performance.now());
        const details = operations.map(op => `${op.name}=${Math.round(op.elapsed)}ms`).join(', ');
        let message = `Started in ${time}ms: ${details}.`;

        if (this.appProfile) {
            message += ` Electron app started in ${this.appProfile.totalTime}ms: `;
            message +=
                this.appProfile.timings
                    .map(op => `${op.name}=${Math.round(op.elapsed)}ms`)
                    .join(', ') + '.';
        }

        logger.info(message);
    },

    reportAppProfile(data) {
        this.appProfile = data;
    }
};

function getNetworkTime() {
    let perfEntry;

    if (performance.getEntriesByType) {
        [perfEntry] = performance.getEntriesByType('navigation');
    }
    if (!perfEntry || !perfEntry.responseEnd || !perfEntry.fetchStart) {
        perfEntry = performance.timing;
    }

    return perfEntry.responseEnd - perfEntry.fetchStart;
}

StartProfiler.milestone('pre-init');

export { StartProfiler };

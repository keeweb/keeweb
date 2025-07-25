import { Logger } from 'util/logger';

const logger = new Logger('start-profiler');

let lastTs = 0;

const operations = [];

const StartProfiler = {
    milestone(name) {
        const ts = logger.ts();
        const elapsed = ts - lastTs;
        lastTs = ts;
        operations.push({ name, elapsed });
    },

    report() {
        const networkTime = this.getNetworkTime();
        operations.unshift({ name: 'fetching', elapsed: networkTime });

        const time = Math.round(performance.now());

        this.printReport('App', operations, time);
    },

    reportAppProfile(data) {
        this.printReport('Electron app', data.timings, data.totalTime);
    },

    printReport(name, operations, totalTime) {
        const message =
            `${name} started in ${totalTime}ms: ` +
            operations.map((op) => `${op.name}=${Math.round(op.elapsed)}ms`).join(', ');

        logger.info(message);
    },

    getNetworkTime() {
        let perfEntry;

        if (performance.getEntriesByType) {
            [perfEntry] = performance.getEntriesByType('navigation');
        }
        if (!perfEntry || !perfEntry.responseEnd || !perfEntry.fetchStart) {
            perfEntry = performance.timing;
        }

        return perfEntry.responseEnd - perfEntry.fetchStart;
    }
};

StartProfiler.milestone('pre-init');

export { StartProfiler };

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
        const time = Math.round(performance.now());
        const details = operations.map(op => `${op.name}: ${Math.round(op.elapsed)}ms`).join(', ');
        logger.info(`Started in ${time}ms. Details: ${details}`);
    }
};

StartProfiler.milestone('pre-init');

export { StartProfiler };

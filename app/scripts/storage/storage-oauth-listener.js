import EventEmitter from 'events';
import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { Locale } from 'util/locale';

const DefaultPort = 48149;
const logger = new Logger('storage-oauth-listener');

const StorageOAuthListener = {
    server: null,

    listen() {
        if (this.server) {
            this.stop();
        }

        const listener = {};
        Object.keys(EventEmitter.prototype).forEach(key => {
            listener[key] = EventEmitter.prototype[key];
        });

        const http = Launcher.req('http');
        const server = http.createServer((req, resp) => {
            resp.writeHead(200, 'OK', {
                'Content-Type': 'text/plain; charset=UTF-8'
            });
            resp.end(Locale.appBrowserAuthComplete);
            this.handleResult(req.url, listener);
        });

        const port = DefaultPort;

        logger.info(`Starting OAuth listener on port ${port}...`);
        server.listen(port);

        server.on('error', err => {
            logger.error('Failed to start OAuth listener', err);
            listener.emit('error', 'Failed to start OAuth listener: ' + err);
            server.close();
        });
        server.on('listening', () => {
            this.server = server;
            listener.emit('ready');
        });

        listener.redirectUri = `http://localhost:${port}/oauth-result`;
        return listener;
    },

    stop() {
        if (this.server) {
            this.server.close();
            logger.info('OAuth listener stopped');
        }
    },

    handleResult(url, listener) {
        logger.info('OAuth result with code received');
        this.stop();
        url = new URL(url, 'http://localhost');
        const state = url.searchParams.get('state');
        const code = url.searchParams.get('code');
        listener.emit('result', { state, code });
    }
};

export { StorageOAuthListener };

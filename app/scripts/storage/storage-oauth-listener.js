import EventEmitter from 'events';
import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { KeeWebLogo } from 'const/inline-images';
import oauthPageTemplate from 'templates/oauth/complete.hbs';

const DefaultPort = 48149;
const logger = new Logger('storage-oauth-listener');

const StorageOAuthListener = {
    server: null,

    listen(storageName) {
        if (this.server) {
            this.stop();
        }

        const listener = {};
        Object.keys(EventEmitter.prototype).forEach((key) => {
            listener[key] = EventEmitter.prototype[key];
        });

        const http = Launcher.req('http');
        let resultHandled = false;
        const server = http.createServer((req, resp) => {
            resp.writeHead(200, 'OK', {
                'Content-Type': 'text/html; charset=UTF-8'
            });
            resp.end(oauthPageTemplate({ logoSrc: KeeWebLogo }));
            if (!resultHandled) {
                this.stop();
                this.handleResult(req.url, listener);
                resultHandled = true;
            }
        });

        const port = DefaultPort;

        logger.info(`Starting OAuth listener on port ${port}...`);
        server.listen(port);

        server.on('error', (err) => {
            logger.error('Failed to start OAuth listener', err);
            listener.emit('error', 'Failed to start OAuth listener: ' + err);
            server.close();
        });
        server.on('listening', () => {
            this.server = server;
            listener.emit('ready');
        });

        listener.redirectUri = `http://localhost:${port}/oauth-result/${storageName}.html`;
        return listener;
    },

    stop() {
        if (this.server) {
            this.server.close();
            logger.info('OAuth listener stopped');
        }
    },

    handleResult(url, listener) {
        url = new URL(url, listener.redirectUri);
        if (url.origin + url.pathname !== listener.redirectUri) {
            logger.info('Skipped result', url, listener.redirectUri);
            return;
        }
        logger.info('OAuth result with code received');
        const state = url.searchParams.get('state');
        const code = url.searchParams.get('code');
        listener.emit('result', { state, code });
    }
};

export { StorageOAuthListener };

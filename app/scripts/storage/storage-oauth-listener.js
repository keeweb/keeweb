import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { noop } from 'util/fn';

const DefaultPort = 48149;
const logger = new Logger('storage-oauth-listener');

const StorageOAuthListener = {
    server: null,

    listen() {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.stop();
            }

            const listener = {
                callback: noop,
                state: Math.round(Math.random() * Date.now()).toString()
            };

            const http = Launcher.req('http');
            const server = http.createServer((req, resp) => {
                resp.writeHead(204);
                resp.end();
                this.handleResult(req.url, listener);
            });

            const port = DefaultPort;
            logger.info(`Starting OAuth listener on port ${port}...`);
            server.listen(port);
            server.on('error', err => {
                logger.error('Failed to start OAuth listener', err);
                reject('Failed to start OAuth listener: ' + err);
                server.close();
            });
            server.on('listening', () => {
                this.server = server;
                listener.redirectUri = `http://127.0.0.1:${port}/oauth-result`;
                this._setCodeVerifier(listener);
                resolve(listener);
            });
        });
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
        if (!state) {
            logger.info('OAuth result has no state');
            return;
        }
        if (state !== listener.state) {
            logger.info('OAuth result has bad state');
            return;
        }
        const code = url.searchParams.get('code');
        if (!code) {
            logger.info('OAuth result has no code');
            return;
        }
        listener.callback(code);
    },

    _setCodeVerifier(listener) {
        const crypto = Launcher.req('crypto');

        listener.codeVerifier = crypto.randomBytes(50).toString('hex');

        const hash = crypto.createHash('sha256');
        hash.update(listener.codeVerifier);

        listener.codeChallenge = hash
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
};

export { StorageOAuthListener };

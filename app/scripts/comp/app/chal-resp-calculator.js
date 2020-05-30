import { Logger } from 'util/logger';
import { YubiKey } from 'comp/app/yubikey';

const logger = new Logger('chal-resp');

const ChalRespCalculator = {
    cache: {},

    build(params) {
        if (!params) {
            return null;
        }
        return challenge => {
            return new Promise((resolve, reject) => {
                const ts = logger.ts();

                challenge = Buffer.from(challenge);
                const hexChallenge = challenge.toString('hex');

                const deviceCacheKey = `${params.vid}:${params.pid}:${params.serial}`;
                const respFromCache = this.cache[deviceCacheKey]?.[hexChallenge];
                if (respFromCache) {
                    logger.debug('Found ChalResp in cache');
                    return resolve(Buffer.from(respFromCache, 'hex'));
                }

                logger.debug('Calculating ChalResp using a YubiKey', params);

                YubiKey.calculateChalResp(params, challenge, (err, response) => {
                    if (err) {
                        if (err.noKey) {
                            logger.debug('No YubiKey');
                            // TODO
                            return;
                        }
                        if (err.touchRequested) {
                            logger.debug('YubiKey touch requested');
                            // TODO
                            return;
                        }
                        return reject(err);
                    }

                    if (!this.cache[deviceCacheKey]) {
                        this.cache[deviceCacheKey] = {};
                    }
                    this.cache[deviceCacheKey][hexChallenge] = response.toString('hex');

                    logger.info('Calculated ChalResp', logger.ts(ts));
                    resolve(response);
                });
            });
        };
    }
};

export { ChalRespCalculator };

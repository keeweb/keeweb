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

                const key = `${params.vid}:${params.pid}:${params.serial}:${hexChallenge}`;
                if (this.cache[key]) {
                    logger.debug('Found ChalResp in cache');
                    return resolve(Buffer.from(this.cache[key], 'hex'));
                }

                logger.debug('Calculating ChalResp using a YubiKey');

                YubiKey.calculateChalResp(params, challenge, (err, response) => {
                    if (err) {
                        return reject(err);
                    }
                    this.cache[key] = response.toString('hex');
                    logger.info('Calculated ChalResp', logger.ts(ts));
                    resolve(response);
                });
            });
        };
    }
};

export { ChalRespCalculator };

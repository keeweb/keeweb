/* eslint-disable no-console */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const keys = require('../keys/onesky.json');

const PROJECT_ID = '173183';
const API_URL = 'https://platform.api.onesky.io/1/projects/:project_id/translations/multilingual';
const PHRASE_COUNT_THRESHOLD_PERCENT = 75;

const ts = Math.floor(new Date() / 1000);

const hashStr = ts + keys.secret;
const hash = crypto.createHash('md5').update(hashStr).digest('hex');
const urlParams = {
    'api_key': keys.public,
    'timestamp': ts,
    'dev_hash': hash,
    'source_file_name': 'base.json',
    'file_format': 'I18NEXT_MULTILINGUAL_JSON'
};
const url = API_URL.replace(':project_id', PROJECT_ID) + '?' +
    Object.keys(urlParams).map(param => param + '=' + urlParams[param]).join('&');
console.log('Sending request...');
https.get(url, res => {
    if (res.statusCode !== 200) {
        console.error(`API error ${res.statusCode}`);
        return;
    }
    console.log('Response received, reading...');
    const data = [];
    res.on('data', chunk => data.push(chunk));
    res.on('end', () => {
        console.log('Data received, parsing...');
        const json = Buffer.concat(data).toString('utf8');
        const languages = JSON.parse(json);
        let langCount = 0;
        let skipCount = 0;
        const totalPhraseCount = Object.keys(languages['en-US'].translation).length;
        Object.keys(languages).forEach(lang => {
            const languageTranslations = languages[lang].translation;
            if (lang === 'en-US' || !languageTranslations) {
                return;
            }
            const langPhraseCount = Object.keys(languageTranslations).length;
            const percentage = Math.round(langPhraseCount / totalPhraseCount * 100);
            const included = percentage >= PHRASE_COUNT_THRESHOLD_PERCENT;
            const action = included ? 'OK' : 'SKIP';
            console.log(`${lang}: ${langPhraseCount} / ${totalPhraseCount} (${percentage}%) -> ${action}`);
            if (included) {
                langCount++;
                const languageJson = JSON.stringify(languageTranslations, null, 4);
                fs.writeFileSync(`app/scripts/locales/${lang}.json`, languageJson);
            } else {
                skipCount++;
            }
        });
        console.log(`Done: ${langCount} written, ${skipCount} skipped`);
    });
});

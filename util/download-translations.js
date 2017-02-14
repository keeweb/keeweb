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

// process.exit(processData(fs.readFileSync('translations.json', 'utf8')));

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
        processData(json);
        fs.writeFileSync('translations.json', json);
    });
});

function processData(json) {
    const languages = JSON.parse(json);
    let langCount = 0;
    let skipCount = 0;
    const enUs = languages['en-US'].translation;
    const totalPhraseCount = Object.keys(enUs).length;
    let errors = 0;
    Object.keys(languages).forEach(lang => {
        const languageTranslations = languages[lang].translation;
        if (lang === 'en-US' || !languageTranslations) {
            return;
        }
        const langPhraseCount = Object.keys(languageTranslations).length;
        const percentage = Math.round(langPhraseCount / totalPhraseCount * 100);
        const included = percentage >= PHRASE_COUNT_THRESHOLD_PERCENT;
        const action = included ? '\x1b[36mOK\x1b[0m' : '\x1b[35mSKIP\x1b[0m';
        console.log(`[${lang}] ${langPhraseCount} / ${totalPhraseCount} (${percentage}%) -> ${action}`);
        if (included) {
            langCount++;
            for (const name of Object.keys(languageTranslations)) {
                let text = languageTranslations[name];
                let enText = enUs[name];
                if (text instanceof Array) {
                    if (!(enText instanceof Array)) {
                        languageTranslations[name] = text.join('\n');
                        console.error(`[${lang}]    \x1b[31mERROR:ARRAY\x1b[0m ${name}`);
                        enText = [enText];
                        errors++;
                    }
                    text = text.join('\n');
                    enText = enText.join('\n');
                }
                if (!enText) {
                    console.warn(`[${lang}] SKIP ${name}`);
                    delete languageTranslations[name];
                    continue;
                }
                const textMatches = text.match(/"/g);
                const textMatchesCount = textMatches && textMatches.length || 0;
                const enTextMatches = enText.match(/"/g);
                const enTextMatchesCount = enTextMatches && enTextMatches.length || 0;
                if (enTextMatchesCount !== textMatchesCount) {
                    const textHl = text.replace(/"/g, '\x1b[33m"\x1b[0m');
                    console.warn(`[${lang}]    \x1b[33mWARN:"\x1b[0m ${name}: ${textHl}`);
                }
                if (/[<>&]/.test(text)) {
                    const textHl = text.replace(/([<>&])/g, '\x1b[31m$1\x1b[0m');
                    console.error(`[${lang}]    \x1b[31mERROR:<>\x1b[0m ${name}: ${textHl}`);
                    errors++;
                }
                if (text.indexOf('{}') >= 0 && enText.indexOf('{}') < 0) {
                    const textHl = text.replace(/\{}/g, '\x1b[31m{}\x1b[0m');
                    console.error(`[${lang}]    \x1b[31mERROR:{}\x1b[0m ${name}: ${textHl}`);
                    errors++;
                }
                if (enText.indexOf('{}') >= 0 && text.indexOf('{}') < 0) {
                    const enTextHl = enText.replace(/\{}/g, '\x1b[31m{}\x1b[0m');
                    console.error(`[${lang}]    \x1b[31mERROR:NO{}\x1b[0m ${name}: ${text} <--> ${enTextHl}`);
                    errors++;
                }
            }
            const languageJson = JSON.stringify(languageTranslations, null, 4);
            fs.writeFileSync(`app/scripts/locales/${lang}.json`, languageJson);
        } else {
            skipCount++;
        }
    });
    console.log(`Done: ${langCount} written, ${skipCount} skipped, ${errors} errors`);
    if (errors) {
        console.error('There were errors, please check the output.');
        process.exit(1);
    }
}

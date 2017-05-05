const fs = require('fs');

const langs = ['de-DE', 'fr-FR'];

for (const lang of langs) {
    fs.writeFileSync(`app/scripts/locales/${lang}.json`, fs.readFileSync(`../keeweb-translations/docs/${lang}/${lang}.json`));
}

import Handlebars from 'hbs';

Handlebars.registerHelper('svg', (name, cls) => {
    const icon = require(`svg/${name}.svg`).default;
    if (cls) {
        return `<svg class="${cls}"` + icon.substr(4);
    }
    return icon;
});

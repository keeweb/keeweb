import { FieldViewText } from 'views/fields/field-view-text';

const FieldViewUrl = FieldViewText.extend({
    displayUrlRegex: /^https:\/\//i,
    cssClass: 'url',

    renderValue(value) {
        return value
            ? '<a href="' +
                  _.escape(this.fixUrl(value)) +
                  '" rel="noreferrer noopener" target="_blank">' +
                  _.escape(this.displayUrl(value)) +
                  '</a>'
            : '';
    },

    fixUrl(url) {
        return url.indexOf(':') < 0 ? 'https://' + url : url;
    },

    displayUrl(url) {
        return url.replace(this.displayUrlRegex, '');
    }
});

export { FieldViewUrl };

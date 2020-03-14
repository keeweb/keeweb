import { FieldViewText } from 'views/fields/field-view-text';
import { escape } from 'util/fn';

class FieldViewUrl extends FieldViewText {
    displayUrlRegex = /^https:\/\//i;
    cssClass = 'url';

    renderValue(value) {
        return value
            ? '<a href="' +
                  escape(this.fixUrl(value)) +
                  '" rel="noreferrer noopener" target="_blank">' +
                  escape(this.displayUrl(value)) +
                  '</a>'
            : '';
    }

    fixUrl(url) {
        return url.indexOf(':') < 0 ? 'https://' + url : url;
    }

    displayUrl(url) {
        return url.replace(this.displayUrlRegex, '');
    }

    getTextValue() {
        return this.fixUrl(this.value);
    }
}

export { FieldViewUrl };

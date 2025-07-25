import { FieldViewText } from 'views/fields/field-view-text';
import { escape } from 'util/fn';

const AllowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:', 'mailto:'];

class FieldViewUrl extends FieldViewText {
    displayUrlRegex = /^https:\/\//i;
    cssClass = 'url';

    renderValue(value) {
        try {
            return value
                ? '<a href="' +
                      escape(this.fixUrl(value)) +
                      '" rel="noreferrer noopener" target="_blank">' +
                      escape(this.displayUrl(value)) +
                      '</a>'
                : '';
        } catch (e) {
            return escape(value);
        }
    }

    fixUrl(url) {
        const proto = new URL(url, 'ws://x').protocol;
        if (proto === 'ws:') {
            return 'https://' + url;
        }
        if (!AllowedProtocols.includes(proto)) {
            throw new Error('Bad url');
        }
        return url;
    }

    displayUrl(url) {
        return url.replace(this.displayUrlRegex, '');
    }

    getTextValue() {
        return this.value;
    }
}

export { FieldViewUrl };
